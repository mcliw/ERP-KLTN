from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, Field
from sqlalchemy import func, case
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok, can_lam_ro

# DB HRM mới: timesheets + attendance_logs
from app.modules.hrm.models import Timesheet, AttendanceLog


class ChamCongNgayArgs(BaseModel):
    employee_id: int = Field(..., ge=1)
    ngay: str = Field(..., description="YYYY-MM-DD")


class ChamCongHomNayArgs(BaseModel):
    employee_id: int = Field(..., ge=1)


class LichSuChamCongArgs(BaseModel):
    employee_id: int = Field(..., ge=1)
    limit: int = Field(10, ge=1, le=60)
    tu_ngay: str | None = Field(None, description="YYYY-MM-DD")
    den_ngay: str | None = Field(None, description="YYYY-MM-DD")


class TongHopChamCongThangArgs(BaseModel):
    employee_id: int = Field(..., ge=1)
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2000, le=2100)


class NgayThieuCheckoutArgs(BaseModel):
    employee_id: int = Field(..., ge=1)
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2000, le=2100)


def _parse_date(s: str) -> date | None:
    try:
        return datetime.strptime((s or "").strip(), "%Y-%m-%d").date()
    except Exception:
        return None


def _ts_row(ts: Timesheet):
    ts_id = getattr(ts, "timesheet_id", None) or getattr(ts, "id", None)
    work_date = getattr(ts, "work_date", None) or getattr(ts, "date", None)
    return {
        "timesheet_id": ts_id,
        "work_date": str(work_date) if work_date else None,
        "status": getattr(ts, "status", None),
        "check_in_time": str(getattr(ts, "check_in_time", None)) if getattr(ts, "check_in_time", None) else None,
        "check_out_time": str(getattr(ts, "check_out_time", None)) if getattr(ts, "check_out_time", None) else None,
        "working_hours": float(getattr(ts, "working_hours", 0) or 0),
        "paid_work_day": float(getattr(ts, "paid_work_day", 0) or 0),
        "note": getattr(ts, "note", None),
    }


def cham_cong_ngay(session: Session, employee_id: int, ngay: str):
    d = _parse_date(ngay)
    if not d:
        return can_lam_ro("Ngày không hợp lệ. Dùng định dạng YYYY-MM-DD.", [])

    q = session.query(Timesheet).filter(Timesheet.employee_id == int(employee_id))
    date_col = getattr(Timesheet, "work_date", None) or getattr(Timesheet, "date", None)
    q = q.filter(date_col == d)
    ts = q.first()
    if not ts:
        return can_lam_ro("Không có dữ liệu chấm công cho ngày này.", [])

    # logs trong ngày (optional)
    start = datetime.combine(d, datetime.min.time())
    end = datetime.combine(d, datetime.max.time())
    logs = (
        session.query(AttendanceLog)
        .filter(
            AttendanceLog.employee_id == int(employee_id),
            AttendanceLog.check_time >= start,
            AttendanceLog.check_time <= end,
        )
        .order_by(AttendanceLog.check_time.asc())
        .limit(50)
        .all()
    )
    log_data = [
        {
            "log_id": getattr(l, "log_id", None) or getattr(l, "id", None),
            "check_time": l.check_time.isoformat() if l.check_time else None,
            "device_id": getattr(l, "device_id", None),
            "confidence_score": getattr(l, "confidence_score", None),
            "image_url": getattr(l, "image_url", None),
        }
        for l in logs
    ]

    data = _ts_row(ts)
    data["attendance_logs"] = log_data
    return ok(data, "Chấm công theo ngày.")


def cham_cong_hom_nay(session: Session, employee_id: int):
    today = date.today().strftime("%Y-%m-%d")
    return cham_cong_ngay(session, employee_id=employee_id, ngay=today)


def lich_su_cham_cong(session: Session, employee_id: int, limit: int = 10, tu_ngay: str | None = None, den_ngay: str | None = None):
    q = session.query(Timesheet).filter(Timesheet.employee_id == int(employee_id))
    date_col = getattr(Timesheet, "work_date", None) or getattr(Timesheet, "date", None)

    if tu_ngay:
        d_from = _parse_date(tu_ngay)
        if not d_from:
            return can_lam_ro("`tu_ngay` không đúng định dạng YYYY-MM-DD.", [])
        q = q.filter(date_col >= d_from)

    if den_ngay:
        d_to = _parse_date(den_ngay)
        if not d_to:
            return can_lam_ro("`den_ngay` không đúng định dạng YYYY-MM-DD.", [])
        q = q.filter(date_col <= d_to)

    rows = q.order_by(date_col.desc()).limit(int(limit)).all()
    data = [_ts_row(r) for r in rows]
    return ok(data, "Lịch sử chấm công.")


def tong_hop_cham_cong_thang(session: Session, employee_id: int, month: int, year: int):
    date_col = getattr(Timesheet, "work_date", None) or getattr(Timesheet, "date", None)

    # present = ON_TIME/LATE/LEAVE_EARLY
    present_status = ["ON_TIME", "LATE", "LEAVE_EARLY"]
    leave_status = ["LEAVE_PAID", "LEAVE_UNPAID"]

    rows = (
        session.query(
            func.count(getattr(Timesheet, "timesheet_id", None) or getattr(Timesheet, "id", None)).label("days_total"),
            func.sum(func.coalesce(Timesheet.working_hours, 0)).label("working_hours"),
            func.sum(func.coalesce(Timesheet.paid_work_day, 0)).label("paid_work_day"),
            func.sum(func.coalesce(case((Timesheet.status.in_(present_status), 1), else_=0), 0)).label("present_days"),
            func.sum(func.coalesce(case((Timesheet.status == "ABSENT", 1), else_=0), 0)).label("absent_days"),
            func.sum(func.coalesce(case((Timesheet.status.in_(leave_status), 1), else_=0), 0)).label("leave_days"),
        )
        .filter(
            Timesheet.employee_id == int(employee_id),
            func.extract("month", date_col) == int(month),
            func.extract("year", date_col) == int(year),
        )
        .first()
    )

    data = {
        "month": int(month),
        "year": int(year),
        "days_total": int(getattr(rows, "days_total", 0) or 0),
        "present_days": int(getattr(rows, "present_days", 0) or 0),
        "absent_days": int(getattr(rows, "absent_days", 0) or 0),
        "leave_days": int(getattr(rows, "leave_days", 0) or 0),
        "working_hours": float(getattr(rows, "working_hours", 0) or 0),
        "paid_work_day": float(getattr(rows, "paid_work_day", 0) or 0),
    }
    return ok(data, "Tổng hợp chấm công theo tháng.")


def ngay_thieu_checkout(session: Session, employee_id: int, month: int, year: int):
    date_col = getattr(Timesheet, "work_date", None) or getattr(Timesheet, "date", None)

    rows = (
        session.query(Timesheet)
        .filter(
            Timesheet.employee_id == int(employee_id),
            func.extract("month", date_col) == int(month),
            func.extract("year", date_col) == int(year),
            Timesheet.check_in_time.isnot(None),
            Timesheet.check_out_time.is_(None),
        )
        .order_by(date_col.asc())
        .all()
    )

    data = [
        {
            "work_date": str(getattr(r, "work_date", None) or getattr(r, "date", None)),
            "check_in_time": str(getattr(r, "check_in_time", None)) if getattr(r, "check_in_time", None) else None,
            "status": getattr(r, "status", None),
        }
        for r in rows
    ]
    return ok({"month": int(month), "year": int(year), "missing_checkout_days": data}, "Danh sách ngày thiếu check-out.")


CHAM_CONG_TOOLS = [
    ToolSpec("cham_cong_ngay", "Tra cứu chấm công theo ngày.", ChamCongNgayArgs, cham_cong_ngay, "hrm"),
    ToolSpec("cham_cong_hom_nay", "Tra cứu chấm công hôm nay.", ChamCongHomNayArgs, cham_cong_hom_nay, "hrm"),
    ToolSpec("lich_su_cham_cong", "Lịch sử chấm công theo ngày.", LichSuChamCongArgs, lich_su_cham_cong, "hrm"),
    ToolSpec("tong_hop_cham_cong_thang", "Tổng hợp chấm công theo tháng.", TongHopChamCongThangArgs, tong_hop_cham_cong_thang, "hrm"),
    ToolSpec("ngay_thieu_checkout", "Danh sách ngày thiếu check-out theo tháng.", NgayThieuCheckoutArgs, ngay_thieu_checkout, "hrm"),
]
