from __future__ import annotations

from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok, can_lam_ro
from app.modules.hrm.models import OTRequest


class DanhSachDonTangCaArgs(BaseModel):
    employee_id: int = Field(..., ge=1)
    status: str | None = Field(None, description="PENDING|APPROVED|REJECTED")
    month: int | None = Field(None, ge=1, le=12)
    year: int | None = Field(None, ge=2000, le=2100)
    limit: int = Field(20, ge=1, le=100)


class ChiTietDonTangCaArgs(BaseModel):
    ot_request_id: int = Field(..., ge=1)


class TongHopTangCaThangArgs(BaseModel):
    employee_id: int = Field(..., ge=1)
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2000, le=2100)


class DonTangCaChoDuyetArgs(BaseModel):
    approver_id: int = Field(..., ge=1)
    limit: int = Field(20, ge=1, le=100)


def danh_sach_don_tang_ca(session: Session, employee_id: int, status: str | None = None, month: int | None = None, year: int | None = None, limit: int = 20):
    q = session.query(OTRequest).filter(OTRequest.employee_id == int(employee_id))
    if status:
        q = q.filter(OTRequest.status == status)
    if month:
        q = q.filter(func.extract("month", OTRequest.ot_date) == int(month))
    if year:
        q = q.filter(func.extract("year", OTRequest.ot_date) == int(year))

    rows = q.order_by(OTRequest.ot_date.desc()).limit(limit).all()
    data = [{
        "ot_request_id": r.id,
        "ot_date": str(r.ot_date) if r.ot_date else None,
        "from_time": str(r.from_time) if r.from_time else None,
        "to_time": str(r.to_time) if r.to_time else None,
        "total_hours": r.total_hours,
        "ot_type": r.ot_type,
        "status": r.status,
        "approver_id": r.approver_id,
        "reason": r.reason,
    } for r in rows]
    return ok(data, "Danh sách đơn tăng ca.")


def chi_tiet_don_tang_ca(session: Session, ot_request_id: int):
    r = session.query(OTRequest).filter(OTRequest.id == int(ot_request_id)).first()
    if not r:
        return can_lam_ro("Không tìm thấy đơn tăng ca theo id.", [])
    data = {
        "ot_request_id": r.id,
        "employee_id": r.employee_id,
        "ot_date": str(r.ot_date) if r.ot_date else None,
        "from_time": str(r.from_time) if r.from_time else None,
        "to_time": str(r.to_time) if r.to_time else None,
        "total_hours": r.total_hours,
        "ot_type": r.ot_type,
        "reason": r.reason,
        "status": r.status,
        "approver_id": r.approver_id,
    }
    return ok(data, "Chi tiết đơn tăng ca.")


def tong_hop_tang_ca_thang(session: Session, employee_id: int, month: int, year: int):
    rows = (
        session.query(
            OTRequest.ot_type,
            func.sum(func.coalesce(OTRequest.total_hours, 0)).label("hours"),
            func.count(OTRequest.id).label("count"),
        )
        .filter(
            OTRequest.employee_id == int(employee_id),
            OTRequest.status == "APPROVED",
            func.extract("month", OTRequest.ot_date) == int(month),
            func.extract("year", OTRequest.ot_date) == int(year),
        )
        .group_by(OTRequest.ot_type)
        .all()
    )
    data = [{
        "ot_type": r.ot_type,
        "approved_total_hours": float(r.hours or 0),
        "approved_count": int(r.count or 0),
    } for r in rows]
    return ok({"month": month, "year": year, "breakdown": data}, "Tổng hợp tăng ca đã duyệt theo tháng.")


def don_tang_ca_cho_duyet(session: Session, approver_id: int, limit: int = 20):
    rows = (
        session.query(OTRequest)
        .filter(OTRequest.status == "PENDING", OTRequest.approver_id == int(approver_id))
        .order_by(OTRequest.ot_date.asc())
        .limit(limit)
        .all()
    )
    data = [{
        "ot_request_id": r.id,
        "employee_id": r.employee_id,
        "ot_date": str(r.ot_date) if r.ot_date else None,
        "total_hours": r.total_hours,
        "ot_type": r.ot_type,
        "reason": r.reason,
        "status": r.status,
    } for r in rows]
    return ok(data, "Danh sách đơn tăng ca đang chờ duyệt.")


TANG_CA_TOOLS = [
    ToolSpec("danh_sach_don_tang_ca", "Danh sách đơn tăng ca của nhân viên.", DanhSachDonTangCaArgs, danh_sach_don_tang_ca, "hrm"),
    ToolSpec("chi_tiet_don_tang_ca", "Chi tiết một đơn tăng ca.", ChiTietDonTangCaArgs, chi_tiet_don_tang_ca, "hrm"),
    ToolSpec("tong_hop_tang_ca_thang", "Tổng hợp OT đã duyệt theo tháng.", TongHopTangCaThangArgs, tong_hop_tang_ca_thang, "hrm"),
    ToolSpec("don_tang_ca_cho_duyet", "Danh sách đơn tăng ca chờ duyệt theo approver_id.", DonTangCaChoDuyetArgs, don_tang_ca_cho_duyet, "hrm"),
]
