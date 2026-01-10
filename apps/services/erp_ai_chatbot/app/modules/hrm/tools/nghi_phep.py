from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok, can_lam_ro
from app.modules.hrm.models import LeaveRequest


class DanhSachDonNghiPhepArgs(BaseModel):
    employee_id: int = Field(..., ge=1)
    status: str | None = Field(None, description="PENDING|APPROVED|REJECTED")
    leave_type: str | None = Field(None, description="ANNUAL|SICK|UNPAID")
    tu_ngay: str | None = Field(None, description="YYYY-MM-DD")
    den_ngay: str | None = Field(None, description="YYYY-MM-DD")
    limit: int = Field(20, ge=1, le=100)


class ChiTietDonNghiPhepArgs(BaseModel):
    leave_request_id: int = Field(..., ge=1)


class TongHopNghiPhepNamArgs(BaseModel):
    employee_id: int = Field(..., ge=1)
    year: int = Field(..., ge=2000, le=2100)
    leave_type: str | None = Field(None, description="ANNUAL|SICK|UNPAID")


class DonNghiPhepChoDuyetArgs(BaseModel):
    approver_id: int = Field(..., ge=1)
    limit: int = Field(20, ge=1, le=100)


def _parse_date(s: str):
    try:
        return datetime.strptime((s or "").strip(), "%Y-%m-%d").date()
    except Exception:
        return None


def danh_sach_don_nghi_phep(session: Session, employee_id: int, status: str | None = None, leave_type: str | None = None,
                            tu_ngay: str | None = None, den_ngay: str | None = None, limit: int = 20):
    q = session.query(LeaveRequest).filter(LeaveRequest.employee_id == int(employee_id))
    if status:
        q = q.filter(LeaveRequest.status == status)
    if leave_type:
        q = q.filter(LeaveRequest.leave_type == leave_type)
    if tu_ngay:
        d = _parse_date(tu_ngay)
        if d:
            q = q.filter(func.date(LeaveRequest.from_date) >= d)
    if den_ngay:
        d = _parse_date(den_ngay)
        if d:
            q = q.filter(func.date(LeaveRequest.to_date) <= d)

    rows = q.order_by(LeaveRequest.from_date.desc()).limit(limit).all()
    data = [{
        "leave_request_id": r.id,
        "leave_type": r.leave_type,
        "from_date": r.from_date.isoformat() if r.from_date else None,
        "to_date": r.to_date.isoformat() if r.to_date else None,
        "total_days": r.total_days,
        "status": r.status,
        "approver_id": r.approver_id,
        "reason": r.reason,
        "approved_at": r.approved_at.isoformat() if getattr(r, "approved_at", None) else None,
    } for r in rows]
    return ok(data, "Danh sách đơn nghỉ phép.")


def chi_tiet_don_nghi_phep(session: Session, leave_request_id: int):
    r = session.query(LeaveRequest).filter(LeaveRequest.id == int(leave_request_id)).first()
    if not r:
        return can_lam_ro("Không tìm thấy đơn nghỉ phép theo id.", [])
    data = {
        "leave_request_id": r.id,
        "employee_id": r.employee_id,
        "leave_type": r.leave_type,
        "from_date": r.from_date.isoformat() if r.from_date else None,
        "to_date": r.to_date.isoformat() if r.to_date else None,
        "total_days": r.total_days,
        "reason": r.reason,
        "status": r.status,
        "approver_id": r.approver_id,
        "approved_at": r.approved_at.isoformat() if getattr(r, "approved_at", None) else None,
    }
    return ok(data, "Chi tiết đơn nghỉ phép.")


def tong_hop_nghi_phep_nam(session: Session, employee_id: int, year: int, leave_type: str | None = None):
    q = (
        session.query(
            func.sum(func.coalesce(LeaveRequest.total_days, 0)).label("total_days")
        )
        .filter(
            LeaveRequest.employee_id == int(employee_id),
            LeaveRequest.status == "APPROVED",
            func.extract("year", LeaveRequest.from_date) == int(year),
        )
    )
    if leave_type:
        q = q.filter(LeaveRequest.leave_type == leave_type)

    row = q.first()
    data = {
        "employee_id": int(employee_id),
        "year": int(year),
        "leave_type": leave_type,
        "approved_total_days": float(row.total_days or 0),
    }
    return ok(data, "Tổng hợp nghỉ phép đã duyệt theo năm.")


def don_nghi_phep_cho_duyet(session: Session, approver_id: int, limit: int = 20):
    rows = (
        session.query(LeaveRequest)
        .filter(LeaveRequest.status == "PENDING", LeaveRequest.approver_id == int(approver_id))
        .order_by(LeaveRequest.from_date.asc())
        .limit(limit)
        .all()
    )
    data = [{
        "leave_request_id": r.id,
        "employee_id": r.employee_id,
        "leave_type": r.leave_type,
        "from_date": r.from_date.isoformat() if r.from_date else None,
        "to_date": r.to_date.isoformat() if r.to_date else None,
        "total_days": r.total_days,
        "reason": r.reason,
        "status": r.status,
    } for r in rows]
    return ok(data, "Danh sách đơn nghỉ phép đang chờ duyệt.")


NGHI_PHEP_TOOLS = [
    ToolSpec("danh_sach_don_nghi_phep", "Danh sách đơn nghỉ phép của nhân viên.", DanhSachDonNghiPhepArgs, danh_sach_don_nghi_phep, "hrm"),
    ToolSpec("chi_tiet_don_nghi_phep", "Chi tiết một đơn nghỉ phép.", ChiTietDonNghiPhepArgs, chi_tiet_don_nghi_phep, "hrm"),
    ToolSpec("tong_hop_nghi_phep_nam", "Tổng hợp số ngày nghỉ (đã duyệt) theo năm.", TongHopNghiPhepNamArgs, tong_hop_nghi_phep_nam, "hrm"),
    ToolSpec("don_nghi_phep_cho_duyet", "Danh sách đơn nghỉ phép chờ duyệt theo approver_id.", DonNghiPhepChoDuyetArgs, don_nghi_phep_cho_duyet, "hrm"),
]
