from __future__ import annotations

from datetime import date, datetime
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok, can_lam_ro
from app.modules.hrm.models import TimesheetDaily, AttendanceLog, WorkShift


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


def _row(ts: TimesheetDaily, shift: WorkShift | None = None):
    return {
        "timesheet_id": ts.id,
        "date": str(ts.date) if ts.date else None,
        "status": ts.status,
        "check_in_time": str(ts.check_in_time) if ts.check_in_time else None,
        "check_out_time": str(ts.check_out_time) if ts.check_out_time else None,
        "late_minutes": ts.late_minutes,
        "early_leave_minutes": ts.early_leave_minutes,
        "ot_hours": ts.ot_hours,
        "working_day_count": ts.working_day_count,
        "note": getattr(ts, "note", None),
        "work_shift_id": ts.work_shift_id,
        "shift_name": getattr(shift, "shift_name", None) if shift else None,
        "shift_start": str(getattr(shift, "start_time", None)) if shift and getattr(shift, "start_time", None) else None,
        "shift_end": str(getattr(shift, "end_time", None)) if shift and getattr(shift, "end_time", None) else None,
    }


def cham_cong_ngay(session: Session, employee_id: int, ngay: str):
    d = _parse_date(ngay)
    if not d:
        return can_lam_ro("Ngày không hợp lệ. Dùng định dạng YYYY-MM-DD.", [])

    ts = (
        session.query(TimesheetDaily)
        .filter(TimesheetDaily.employee_id == int(employee_id), TimesheetDaily.date == d)
        .first()
    )
    if not ts:
        return can_lam_ro("Không có dữ liệu chấm công cho ngày này.", [])

    shift = session.query(WorkShift).filter(WorkShift.id == ts.work_shift_id).first() if ts.work_shift_id else None

    # logs trong ngày (optional)
    start = datetime.combine(d, datetime.min.time())
    end = datetime.combine(d, datetime.max.time())
    logs = (
        session.query(AttendanceLog)
        .filter(AttendanceLog.employee_id == int(employee_id), AttendanceLog.check_time >= start, AttendanceLog.check_time <= end)
        .order_by(AttendanceLog.check_time.asc())
        .limit(20)
        .all()
    )
    log_data = [{
        "check_time": l.check_time.isoformat() if l.check_time else None,
        "device_id": getattr(l, "device_id", None),
        "confidence_score": l.confidence_score,
    } for l in logs]

    data = _row(ts, shift)
    data["attendance_logs"] = log_data
    return ok(data, "Chấm công theo ngày.")


def cham_cong_hom_nay(session: Session, employee_id: int):
    today = date.today().strftime("%Y-%m-%d")
    return cham_cong_ngay(session, employee_id=employee_id, ngay=today)


def lich_su_cham_cong(session: Session, employee_id: int, limit: int = 10, tu_ngay: str | None = None, den_ngay: str | None = None):
    q = session.query(TimesheetDaily).filter(TimesheetDaily.employee_id == int(employee_id))

    if tu_ngay:
        d = _parse_date(tu_ngay)
        if d:
            q = q.filter(TimesheetDaily.date >= d)
    if den_ngay:
        d = _parse_date(den_ngay)
        if d:
            q = q.filter(TimesheetDaily.date <= d)

    rows = q.order_by(TimesheetDaily.date.desc()).limit(limit).all()
    data = [{
        "date": str(r.date) if r.date else None,
        "status": r.status,
        "check_in_time": str(r.check_in_time) if r.check_in_time else None,
        "check_out_time": str(r.check_out_time) if r.check_out_time else None,
        "late_minutes": r.late_minutes,
        "early_leave_minutes": r.early_leave_minutes,
        "ot_hours": r.ot_hours,
        "working_day_count": r.working_day_count,
    } for r in rows]
    return ok(data, "Lịch sử chấm công.")


def tong_hop_cham_cong_thang(session: Session, employee_id: int, month: int, year: int):
    rows = (
        session.query(
            func.count(TimesheetDaily.id).label("days_total"),
            func.sum(func.coalesce(TimesheetDaily.late_minutes, 0)).label("late_minutes"),
            func.sum(func.coalesce(TimesheetDaily.early_leave_minutes, 0)).label("early_leave_minutes"),
            func.sum(func.coalesce(TimesheetDaily.ot_hours, 0)).label("ot_hours"),
            func.sum(func.coalesce(TimesheetDaily.working_day_count, 0)).label("working_day_count"),
            func.sum(func.case((TimesheetDaily.status == "PRESENT", 1), else_=0)).label("present_days"),
            func.sum(func.case((TimesheetDaily.status == "ABSENT", 1), else_=0)).label("absent_days"),
            func.sum(func.case((TimesheetDaily.status == "LEAVE", 1), else_=0)).label("leave_days"),
        )
        .filter(
            TimesheetDaily.employee_id == int(employee_id),
            func.extract("month", TimesheetDaily.date) == int(month),
            func.extract("year", TimesheetDaily.date) == int(year),
        )
        .first()
    )

    data = {
        "month": int(month),
        "year": int(year),
        "days_total": int(rows.days_total or 0),
        "present_days": int(rows.present_days or 0),
        "absent_days": int(rows.absent_days or 0),
        "leave_days": int(rows.leave_days or 0),
        "late_minutes": int(rows.late_minutes or 0),
        "early_leave_minutes": int(rows.early_leave_minutes or 0),
        "ot_hours": float(rows.ot_hours or 0),
        "working_day_count": float(rows.working_day_count or 0),
    }
    return ok(data, "Tổng hợp chấm công theo tháng.")


def ngay_thieu_checkout(session: Session, employee_id: int, month: int, year: int):
    rows = (
        session.query(TimesheetDaily)
        .filter(
            TimesheetDaily.employee_id == int(employee_id),
            func.extract("month", TimesheetDaily.date) == int(month),
            func.extract("year", TimesheetDaily.date) == int(year),
            TimesheetDaily.status == "PRESENT",
            TimesheetDaily.check_in_time.isnot(None),
            TimesheetDaily.check_out_time.is_(None),
        )
        .order_by(TimesheetDaily.date.asc())
        .all()
    )
    data = [{"date": str(r.date), "check_in_time": str(r.check_in_time) if r.check_in_time else None} for r in rows]
    return ok({"month": month, "year": year, "missing_checkout_days": data}, "Danh sách ngày thiếu check-out.")


CHAM_CONG_TOOLS = [
    ToolSpec("cham_cong_ngay", "Tra cứu chấm công theo ngày.", ChamCongNgayArgs, cham_cong_ngay, "hrm"),
    ToolSpec("cham_cong_hom_nay", "Tra cứu chấm công hôm nay.", ChamCongHomNayArgs, cham_cong_hom_nay, "hrm"),
    ToolSpec("lich_su_cham_cong", "Lịch sử chấm công theo ngày.", LichSuChamCongArgs, lich_su_cham_cong, "hrm"),
    ToolSpec("tong_hop_cham_cong_thang", "Tổng hợp chấm công theo tháng.", TongHopChamCongThangArgs, tong_hop_cham_cong_thang, "hrm"),
    ToolSpec("ngay_thieu_checkout", "Danh sách ngày thiếu check-out theo tháng.", NgayThieuCheckoutArgs, ngay_thieu_checkout, "hrm"),
]
