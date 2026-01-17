from __future__ import annotations

from pydantic import BaseModel, Field, field_validator, model_validator
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok, can_lam_ro
from app.modules.hrm.models import OTRequest
from app.modules.hrm.models import TimesheetDaily, Employee
from datetime import datetime, date as date_type
from typing import Optional

from datetime import datetime, date as date_type, timedelta
from typing import Optional
import re

def _today_local() -> date_type:
    try:
        from zoneinfo import ZoneInfo
        return datetime.now(ZoneInfo("Asia/Bangkok")).date()
    except Exception:
        return datetime.now().date()

def _parse_date(s: str | None) -> Optional[date_type]:
    if s is None:
        return None

    raw = str(s).strip()
    if not raw:
        return None

    low = raw.lower()

    # aliases
    if low in {"today", "now", "current", "hom nay", "hôm nay", "nay"}:
        return _today_local()
    if low in {"yesterday", "hom qua", "hôm qua"}:
        return _today_local() - timedelta(days=1)
    if low in {"tomorrow", "ngay mai", "ngày mai"}:
        return _today_local() + timedelta(days=1)

    # thử các format phổ biến (ưu tiên VN: DD/MM/YYYY)
    for fmt in (
        "%Y-%m-%d",
        "%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y",
        "%Y/%m/%d", "%Y-%m-%d", "%Y.%m.%d",
        "%d/%m/%y", "%d-%m-%y", "%d.%m.%y",
    ):
        try:
            return datetime.strptime(raw, fmt).date()
        except Exception:
            pass

    # fallback regex: 10/1/2026, 10-1-2026, 10.1.26...
    m = re.match(r"^\s*(\d{1,4})[\/\-.](\d{1,2})[\/\-.](\d{1,4})\s*$", raw)
    if not m:
        return None

    a, b, c = (int(m.group(1)), int(m.group(2)), int(m.group(3)))

    # nếu dạng YYYY/MM/DD
    if a >= 1000:
        y, mo, d = a, b, c
    else:
        # mặc định VN: DD/MM/YYYY
        d, mo, y = a, b, c

    if y < 100:  # 2-digit year -> 2000+
        y += 2000

    try:
        return datetime(y, mo, d).date()
    except Exception:
        return None

class TangCaTheoNgayArgs(BaseModel):
    # cho phép 1-step hoặc multi-step
    employee_id: Optional[int] = Field(None, ge=1)
    employee_code: Optional[str] = Field(None, min_length=1)
    date: Optional[str] = Field(None, description="YYYY-MM-DD; mặc định hôm nay")

    @field_validator("employee_code", mode="before")
    @classmethod
    def _norm_code(cls, v):
        if v is None:
            return None
        s = str(v).strip()
        return s or None

    @model_validator(mode="after")
    def _check_one_of(self):
        if not self.employee_id and not self.employee_code:
            raise ValueError("Cần employee_id hoặc employee_code")
        return self


def ot_theo_ngay(session: Session, employee_id: int | None = None, employee_code: str | None = None, date: str | None = None):
    # resolve employee_id nếu user đưa code
    if not employee_id and employee_code:
        emp = session.query(Employee).filter(Employee.employee_code == employee_code).first()
        if not emp:
            return can_lam_ro(f"Không tìm thấy nhân viên với mã {employee_code}.", [])
        employee_id = int(emp.id)

    target_date = _parse_date(date) if date else _today_local()
    if not target_date:
        return can_lam_ro("Ngày không hợp lệ. Dùng YYYY-MM-DD hoặc DD/MM/YYYY.", [])


    r = (
        session.query(TimesheetDaily)
        .filter(TimesheetDaily.employee_id == int(employee_id), TimesheetDaily.date == target_date)
        .first()
    )

    # Không có timesheet => không kết luận OT
    if not r:
        data = {"date": target_date.isoformat(), "has_ot": False, "ot_hours": 0}
        return ok(data, f"Chưa có dữ liệu chấm công ngày {target_date:%d/%m/%Y}, nên chưa xác định được OT.")

    ot_hours = float(getattr(r, "ot_hours", 0) or 0)
    data = {"date": target_date.isoformat(), "has_ot": ot_hours > 0, "ot_hours": ot_hours}

    if ot_hours > 0:
        return ok(data, f"Có OT {ot_hours} giờ.")
    return ok(data, "Không có OT.")


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
    ToolSpec("ot_theo_ngay", "Tra cứu OT theo ngày (từ TimesheetDaily.ot_hours).", TangCaTheoNgayArgs, ot_theo_ngay, "hrm"),
    ToolSpec("don_tang_ca_cho_duyet", "Danh sách đơn tăng ca chờ duyệt theo approver_id.", DonTangCaChoDuyetArgs, don_tang_ca_cho_duyet, "hrm"),
]
