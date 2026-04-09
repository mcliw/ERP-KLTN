# apps/services/erp_ai_chatbot/app/modules/hrm/tools/nghi_phep.py
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok, can_lam_ro

# DB HRM mới: leave_requests + leave_balances
from app.modules.hrm.models import LeaveRequest, LeaveBalance


def _normalize_leave_status(status: str | None) -> str | None:
    if status is None:
        return None
    raw = str(status).strip()
    if not raw:
        return None

    low = raw.lower()
    aliases = {
        "pending": "PENDING",
        "cho duyet": "PENDING",
        "chờ duyệt": "PENDING",
        "waiting": "PENDING",
        "awaiting": "PENDING",

        "approved": "APPROVED",
        "da duyet": "APPROVED",
        "đã duyệt": "APPROVED",

        "rejected": "REJECTED",
        "tu choi": "REJECTED",
        "từ chối": "REJECTED",
    }
    return aliases.get(low, raw.upper())


def _normalize_leave_type(t: str | None) -> str | None:
    """Map alias về enum leave_type_enum của DB mới.

    DB mới: PAID | UNPAID | SICK | MATERNITY
    Thực tế người dùng hay hỏi: ANNUAL/SICK/UNPAID
    """
    if t is None:
        return None
    raw = str(t).strip()
    if not raw:
        return None

    low = raw.lower()
    aliases = {
        "annual": "PAID",
        "paid": "PAID",
        "phep nam": "PAID",
        "phép năm": "PAID",

        "unpaid": "UNPAID",
        "khong luong": "UNPAID",
        "không lương": "UNPAID",

        "sick": "SICK",
        "om": "SICK",
        "ốm": "SICK",

        "maternity": "MATERNITY",
        "thai san": "MATERNITY",
        "thai sản": "MATERNITY",
    }
    return aliases.get(low, raw.upper())


LeaveStatus = Literal["PENDING", "APPROVED", "REJECTED"]
LeaveType = Literal["PAID", "UNPAID", "SICK", "MATERNITY"]


class DanhSachDonNghiPhepArgs(BaseModel):
    employee_id: int = Field(..., ge=1)
    status: LeaveStatus | None = Field(None, description="PENDING|APPROVED|REJECTED")
    leave_type: LeaveType | None = Field(None, description="PAID|UNPAID|SICK|MATERNITY")
    tu_ngay: str | None = Field(None, description="YYYY-MM-DD")
    den_ngay: str | None = Field(None, description="YYYY-MM-DD")
    limit: int = Field(20, ge=1, le=100)

    @field_validator("status", mode="before")
    @classmethod
    def _norm_status(cls, v):
        if v is None:
            return None
        return _normalize_leave_status(v)

    @field_validator("leave_type", mode="before")
    @classmethod
    def _norm_type(cls, v):
        if v is None:
            return None
        return _normalize_leave_type(v)


class ChiTietDonNghiPhepArgs(BaseModel):
    leave_request_id: int = Field(..., ge=1)


class TongHopNghiPhepNamArgs(BaseModel):
    employee_id: int = Field(..., ge=1)
    year: int = Field(..., ge=2000, le=2100)
    leave_type: str | None = Field(None, description="PAID|UNPAID|SICK|MATERNITY")


class DonNghiPhepChoDuyetArgs(BaseModel):
    approver_id: int = Field(..., ge=1)
    limit: int = Field(20, ge=1, le=100)


def _parse_date(s: str):
    try:
        return datetime.strptime((s or "").strip(), "%Y-%m-%d").date()
    except Exception:
        return None


def _days_between(start, end) -> int:
    if not start or not end:
        return 0
    try:
        return max(0, (end - start).days + 1)
    except Exception:
        return 0


def danh_sach_don_nghi_phep(
    session: Session,
    employee_id: int,
    status: str | None = None,
    leave_type: str | None = None,
    tu_ngay: str | None = None,
    den_ngay: str | None = None,
    limit: int = 20,
):
    q = session.query(LeaveRequest).filter(LeaveRequest.employee_id == int(employee_id))

    if status:
        status_norm = _normalize_leave_status(status)
        q = q.filter(LeaveRequest.status == status_norm)

    if leave_type:
        t_norm = _normalize_leave_type(leave_type)
        if t_norm:
            q = q.filter(LeaveRequest.leave_type == t_norm)

    d_from = _parse_date(tu_ngay) if tu_ngay else None
    d_to = _parse_date(den_ngay) if den_ngay else None

    if tu_ngay and not d_from:
        return can_lam_ro("`tu_ngay` không đúng định dạng YYYY-MM-DD.", [])
    if den_ngay and not d_to:
        return can_lam_ro("`den_ngay` không đúng định dạng YYYY-MM-DD.", [])

    if d_from:
        q = q.filter(LeaveRequest.start_date >= d_from)
    if d_to:
        q = q.filter(LeaveRequest.end_date <= d_to)

    rows = q.order_by(LeaveRequest.start_date.desc()).limit(int(limit)).all()

    data = []
    for r in rows:
        total_days = _days_between(getattr(r, "start_date", None), getattr(r, "end_date", None))
        data.append({
            "leave_request_id": getattr(r, "request_id", None) or getattr(r, "id", None),
            "employee_id": r.employee_id,
            "leave_type": r.leave_type,
            "start_date": r.start_date.isoformat() if r.start_date else None,
            "end_date": r.end_date.isoformat() if r.end_date else None,
            "total_days": total_days,
            "reason": getattr(r, "reason", None),
            "status": r.status,
            "approver_id": getattr(r, "approver_id", None),
            "rejection_reason": getattr(r, "rejection_reason", None),
            "created_at": r.created_at.isoformat() if getattr(r, "created_at", None) else None,
            "updated_at": r.updated_at.isoformat() if getattr(r, "updated_at", None) else None,
        })

    return ok(data, "Danh sách đơn nghỉ phép.")


def chi_tiet_don_nghi_phep(session: Session, leave_request_id: int):
    id_col = getattr(LeaveRequest, "request_id", None) or getattr(LeaveRequest, "id", None)
    r = session.query(LeaveRequest).filter(id_col == int(leave_request_id)).first()
    if not r:
        return can_lam_ro("Không tìm thấy đơn nghỉ phép theo id.", [])

    total_days = _days_between(getattr(r, "start_date", None), getattr(r, "end_date", None))

    data = {
        "leave_request_id": getattr(r, "request_id", None) or getattr(r, "id", None),
        "employee_id": r.employee_id,
        "leave_type": r.leave_type,
        "start_date": r.start_date.isoformat() if r.start_date else None,
        "end_date": r.end_date.isoformat() if r.end_date else None,
        "total_days": total_days,
        "reason": getattr(r, "reason", None),
        "status": r.status,
        "approver_id": getattr(r, "approver_id", None),
        "rejection_reason": getattr(r, "rejection_reason", None),
        "created_at": r.created_at.isoformat() if getattr(r, "created_at", None) else None,
        "updated_at": r.updated_at.isoformat() if getattr(r, "updated_at", None) else None,
    }
    return ok(data, "Chi tiết đơn nghỉ phép.")


def tong_hop_nghi_phep_nam(session: Session, employee_id: int, year: int, leave_type: str | None = None):
    # 1) Tổng ngày nghỉ đã duyệt theo leave_requests (tính theo start_date/end_date)
    q = session.query(LeaveRequest).filter(
        LeaveRequest.employee_id == int(employee_id),
        LeaveRequest.status == "APPROVED",
        func.extract("year", LeaveRequest.start_date) == int(year),
    )

    if leave_type:
        t_norm = _normalize_leave_type(leave_type)
        if t_norm:
            q = q.filter(LeaveRequest.leave_type == t_norm)

    rows = q.all()
    approved_days = sum(_days_between(r.start_date, r.end_date) for r in rows)

    # 2) Lấy leave_balance (nếu có) để bổ sung entitlement/used/remaining
    bal = session.query(LeaveBalance).filter(LeaveBalance.employee_id == int(employee_id), LeaveBalance.year == int(year)).first()

    data = {
        "employee_id": int(employee_id),
        "year": int(year),
        "leave_type": _normalize_leave_type(leave_type) if leave_type else None,
        "approved_total_days": float(approved_days),
        "entitlement": float(getattr(bal, "total_entitlement", 0) or 0) if bal else None,
        "used": float(getattr(bal, "used", 0) or 0) if bal else None,
        "remaining": float(getattr(bal, "remaining", 0) or 0) if bal else None,
    }
    return ok(data, "Tổng hợp nghỉ phép đã duyệt theo năm.")


def don_nghi_phep_cho_duyet(session: Session, approver_id: int, limit: int = 20):
    rows = (
        session.query(LeaveRequest)
        .filter(LeaveRequest.status == "PENDING", LeaveRequest.approver_id == int(approver_id))
        .order_by(LeaveRequest.start_date.asc())
        .limit(int(limit))
        .all()
    )

    data = []
    for r in rows:
        data.append({
            "leave_request_id": getattr(r, "request_id", None) or getattr(r, "id", None),
            "employee_id": r.employee_id,
            "leave_type": r.leave_type,
            "start_date": r.start_date.isoformat() if r.start_date else None,
            "end_date": r.end_date.isoformat() if r.end_date else None,
            "total_days": _days_between(r.start_date, r.end_date),
            "reason": getattr(r, "reason", None),
            "status": r.status,
        })

    return ok(data, "Danh sách đơn nghỉ phép đang chờ duyệt.")


NGHI_PHEP_TOOLS = [
    ToolSpec("danh_sach_don_nghi_phep", "Danh sách đơn nghỉ phép của nhân viên.", DanhSachDonNghiPhepArgs, danh_sach_don_nghi_phep, "hrm"),
    ToolSpec("chi_tiet_don_nghi_phep", "Chi tiết một đơn nghỉ phép.", ChiTietDonNghiPhepArgs, chi_tiet_don_nghi_phep, "hrm"),
    ToolSpec("tong_hop_nghi_phep_nam", "Tổng hợp số ngày nghỉ (đã duyệt) theo năm.", TongHopNghiPhepNamArgs, tong_hop_nghi_phep_nam, "hrm"),
    ToolSpec("don_nghi_phep_cho_duyet", "Danh sách đơn nghỉ phép chờ duyệt theo approver_id.", DonNghiPhepChoDuyetArgs, don_nghi_phep_cho_duyet, "hrm"),
]
