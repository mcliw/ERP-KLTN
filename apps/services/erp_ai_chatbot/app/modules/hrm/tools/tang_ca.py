from __future__ import annotations

from pydantic import BaseModel, Field, field_validator, model_validator
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok, can_lam_ro
from app.modules.hrm.models import Timesheet, Employee
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
        employee_id = int(getattr(emp, "employee_id", None) or getattr(emp, "id", None))

    target_date = _parse_date(date) if date else _today_local()
    if not target_date:
        return can_lam_ro("Ngày không hợp lệ. Dùng YYYY-MM-DD hoặc DD/MM/YYYY.", [])


    date_col = getattr(Timesheet, "work_date", None) or getattr(Timesheet, "date", None)
    r = (
        session.query(Timesheet)
        .filter(Timesheet.employee_id == int(employee_id), date_col == target_date)
        .first()
    )

    # Không có timesheet => không kết luận OT
    if not r:
        data = {"date": target_date.isoformat(), "has_ot": False, "ot_hours": 0}
        return ok(data, f"Chưa có dữ liệu chấm công ngày {target_date:%d/%m/%Y}, nên chưa xác định được OT.")

    # DB mới không có cột OT riêng. Ước tính: OT = max(0, working_hours - 8)
    wh = float(getattr(r, "working_hours", 0) or 0)
    ot_hours = max(0.0, wh - 8.0)
    data = {"date": target_date.isoformat(), "has_ot": ot_hours > 0, "ot_hours": ot_hours}

    if ot_hours > 0:
        return ok(data, f"Có OT {ot_hours} giờ.")
    return ok(data, "Không có OT.")


class DanhSachDonTangCaArgs(BaseModel):
    """DB mới không có bảng đơn tăng ca. Tool này liệt kê các ngày có OT (ước tính từ timesheets.working_hours)."""
    employee_id: int = Field(..., ge=1)
    month: int | None = Field(None, ge=1, le=12)
    year: int | None = Field(None, ge=2000, le=2100)
    limit: int = Field(20, ge=1, le=100)


class ChiTietDonTangCaArgs(BaseModel):
    """Diễn giải ot_request_id như timesheet_id trong DB mới."""
    ot_request_id: int = Field(..., ge=1)


class TongHopTangCaThangArgs(BaseModel):
    employee_id: int = Field(..., ge=1)
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2000, le=2100)


class DonTangCaChoDuyetArgs(BaseModel):
    approver_id: int = Field(..., ge=1)
    limit: int = Field(20, ge=1, le=100)


def danh_sach_don_tang_ca(session: Session, employee_id: int, month: int | None = None, year: int | None = None, limit: int = 20):
    date_col = getattr(Timesheet, "work_date", None) or getattr(Timesheet, "date", None)
    q = session.query(Timesheet).filter(Timesheet.employee_id == int(employee_id))
    if month:
        q = q.filter(func.extract("month", date_col) == int(month))
    if year:
        q = q.filter(func.extract("year", date_col) == int(year))

    q = q.order_by(date_col.desc())
    rows = q.limit(int(limit)).all()

    data = []
    for r in rows:
        wh = float(getattr(r, "working_hours", 0) or 0)
        ot_hours = max(0.0, wh - 8.0)
        if ot_hours <= 0:
            continue
        data.append({
            "ot_request_id": getattr(r, "timesheet_id", None) or getattr(r, "id", None),
            "ot_date": str(getattr(r, "work_date", None) or getattr(r, "date", None)),
            "total_hours": ot_hours,
            "working_hours": wh,
            "status": getattr(r, "status", None),
            "note": getattr(r, "note", None),
        })

    return ok(data, "Danh sách ngày có tăng ca (ước tính từ timesheets.working_hours).")


def chi_tiet_don_tang_ca(session: Session, ot_request_id: int):
    # DB mới không có bảng OTRequest; diễn giải ot_request_id = timesheet_id
    id_col = getattr(Timesheet, "timesheet_id", None) or getattr(Timesheet, "id", None)
    r = session.query(Timesheet).filter(id_col == int(ot_request_id)).first()
    if not r:
        return can_lam_ro("Không tìm thấy bản ghi timesheet theo id (dùng thay cho OT request).", [])

    wh = float(getattr(r, "working_hours", 0) or 0)
    ot_hours = max(0.0, wh - 8.0)

    data = {
        "ot_request_id": int(ot_request_id),
        "employee_id": getattr(r, "employee_id", None),
        "ot_date": str(getattr(r, "work_date", None) or getattr(r, "date", None)),
        "working_hours": wh,
        "total_hours": ot_hours,
        "status": getattr(r, "status", None),
        "check_in_time": str(getattr(r, "check_in_time", None)) if getattr(r, "check_in_time", None) else None,
        "check_out_time": str(getattr(r, "check_out_time", None)) if getattr(r, "check_out_time", None) else None,
        "note": getattr(r, "note", None),
    }
    return ok(data, "Chi tiết tăng ca (ước tính từ timesheet).")


def tong_hop_tang_ca_thang(session: Session, employee_id: int, month: int, year: int):
    date_col = getattr(Timesheet, "work_date", None) or getattr(Timesheet, "date", None)
    rows = (
        session.query(Timesheet)
        .filter(
            Timesheet.employee_id == int(employee_id),
            func.extract("month", date_col) == int(month),
            func.extract("year", date_col) == int(year),
        )
        .all()
    )

    total_ot = 0.0
    count_days = 0
    for r in rows:
        wh = float(getattr(r, "working_hours", 0) or 0)
        ot_hours = max(0.0, wh - 8.0)
        if ot_hours > 0:
            total_ot += ot_hours
            count_days += 1

    return ok(
        {
            "month": int(month),
            "year": int(year),
            "approved_total_hours": float(total_ot),
            "ot_days": int(count_days),
            "note": "DB hiện tại không có bảng duyệt OT; OT được ước tính từ working_hours > 8.",
        },
        "Tổng hợp tăng ca theo tháng (ước tính).",
    )


def don_tang_ca_cho_duyet(session: Session, approver_id: int, limit: int = 20):
    # DB mới không có quy trình duyệt tăng ca riêng.
    return ok(
        [],
        "DB HRM hiện tại không có bảng đơn tăng ca/duyệt tăng ca. Tool trả về rỗng để LLM biết nghiệp vụ này chưa được mô hình hoá.",
    )


TANG_CA_TOOLS = [
    ToolSpec("danh_sach_don_tang_ca", "Danh sách đơn tăng ca của nhân viên.", DanhSachDonTangCaArgs, danh_sach_don_tang_ca, "hrm"),
    ToolSpec("chi_tiet_don_tang_ca", "Chi tiết một đơn tăng ca.", ChiTietDonTangCaArgs, chi_tiet_don_tang_ca, "hrm"),
    ToolSpec(
        "tong_hop_tang_ca_thang",
        "Tổng hợp OT theo tháng (ước tính từ timesheets.working_hours).",
        TongHopTangCaThangArgs,
        tong_hop_tang_ca_thang,
        "hrm",
    ),
    ToolSpec(
        "ot_theo_ngay",
        "Tra cứu OT theo ngày (ước tính từ timesheets.working_hours).",
        TangCaTheoNgayArgs,
        ot_theo_ngay,
        "hrm",
    ),
    ToolSpec("don_tang_ca_cho_duyet", "Danh sách đơn tăng ca chờ duyệt theo approver_id.", DonTangCaChoDuyetArgs, don_tang_ca_cho_duyet, "hrm"),
]
