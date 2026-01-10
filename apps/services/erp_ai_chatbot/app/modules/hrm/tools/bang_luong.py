from __future__ import annotations

from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok, can_lam_ro
from app.modules.hrm.models import PayrollPeriod, Payslip, PayslipDetail, SalaryRule


class DanhSachKyLuongArgs(BaseModel):
    year: int | None = Field(None, ge=2000, le=2100)
    status: str | None = Field(None, description="OPEN|CLOSED")
    limit: int = Field(12, ge=1, le=60)


class KyLuongArgs(BaseModel):
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2000, le=2100)


class BangLuongThangArgs(BaseModel):
    employee_id: int = Field(..., ge=1)
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2000, le=2100)


class ChiTietBangLuongArgs(BaseModel):
    payslip_id: int = Field(..., ge=1)


class LichSuBangLuongArgs(BaseModel):
    employee_id: int = Field(..., ge=1)
    limit: int = Field(6, ge=1, le=24)


def danh_sach_ky_luong(session: Session, year: int | None = None, status: str | None = None, limit: int = 12):
    q = session.query(PayrollPeriod)
    if year:
        q = q.filter(PayrollPeriod.year == int(year))
    if status:
        q = q.filter(PayrollPeriod.status == status)

    rows = q.order_by(PayrollPeriod.year.desc(), PayrollPeriod.month.desc()).limit(limit).all()
    data = [{
        "payroll_period_id": r.id,
        "name": r.name,
        "month": r.month,
        "year": r.year,
        "start_date": str(r.start_date) if r.start_date else None,
        "end_date": str(r.end_date) if r.end_date else None,
        "standard_working_days": r.standard_working_days,
        "status": r.status,
    } for r in rows]
    return ok(data, "Danh sách kỳ lương.")


def ky_luong(session: Session, month: int, year: int):
    r = session.query(PayrollPeriod).filter(PayrollPeriod.month == int(month), PayrollPeriod.year == int(year)).first()
    if not r:
        return can_lam_ro("Không tìm thấy kỳ lương theo tháng/năm.", [])
    data = {
        "payroll_period_id": r.id,
        "name": r.name,
        "month": r.month,
        "year": r.year,
        "start_date": str(r.start_date) if r.start_date else None,
        "end_date": str(r.end_date) if r.end_date else None,
        "status": r.status,
        "standard_working_days": r.standard_working_days,
    }
    return ok(data, "Kỳ lương.")


def bang_luong_thang(session: Session, employee_id: int, month: int, year: int):
    period = session.query(PayrollPeriod).filter(PayrollPeriod.month == int(month), PayrollPeriod.year == int(year)).first()
    if not period:
        return can_lam_ro("Không tìm thấy kỳ lương theo tháng/năm.", [])

    ps = session.query(Payslip).filter(Payslip.employee_id == int(employee_id), Payslip.payroll_period_id == period.id).first()
    if not ps:
        return can_lam_ro("Không có bảng lương của nhân viên trong kỳ này.", [])

    data = {
        "payslip_id": ps.id,
        "employee_id": ps.employee_id,
        "payroll_period_id": ps.payroll_period_id,
        "period_name": period.name,
        "month": period.month,
        "year": period.year,
        "total_working_days": ps.total_working_days,
        "total_ot_hours": ps.total_ot_hours,
        "gross_salary": float(ps.gross_salary) if ps.gross_salary is not None else None,
        "total_deduction": float(ps.total_deduction) if ps.total_deduction is not None else None,
        "net_salary": float(ps.net_salary) if ps.net_salary is not None else None,
        "status": ps.status,
        "created_at": ps.created_at.isoformat() if ps.created_at else None,
    }
    return ok(data, "Bảng lương theo tháng.")


def chi_tiet_bang_luong(session: Session, payslip_id: int):
    rows = (
        session.query(PayslipDetail, SalaryRule)
        .join(SalaryRule, SalaryRule.id == PayslipDetail.salary_rule_id, isouter=True)
        .filter(PayslipDetail.payslip_id == int(payslip_id))
        .order_by(SalaryRule.type.asc(), SalaryRule.code.asc())
        .all()
    )
    if not rows:
        return can_lam_ro("Không có chi tiết bảng lương (payslip_detail) cho payslip này.", [])

    data = []
    for d, r in rows:
        data.append({
            "payslip_detail_id": d.id,
            "salary_rule_id": d.salary_rule_id,
            "rule_code": getattr(r, "code", None),
            "rule_name": getattr(r, "name", None),
            "rule_type": getattr(r, "type", None),
            "amount": float(d.amount) if d.amount is not None else None,
            "note": getattr(d, "note", None),
        })

    # summary
    total_allow = sum((x["amount"] or 0) for x in data if x.get("rule_type") == "ALLOWANCE")
    total_ded = sum((x["amount"] or 0) for x in data if x.get("rule_type") == "DEDUCTION")

    return ok({
        "payslip_id": int(payslip_id),
        "total_allowance": float(total_allow),
        "total_deduction": float(total_ded),
        "lines": data,
    }, "Chi tiết bảng lương.")


def lich_su_bang_luong(session: Session, employee_id: int, limit: int = 6):
    rows = (
        session.query(Payslip, PayrollPeriod)
        .join(PayrollPeriod, PayrollPeriod.id == Payslip.payroll_period_id)
        .filter(Payslip.employee_id == int(employee_id))
        .order_by(PayrollPeriod.year.desc(), PayrollPeriod.month.desc())
        .limit(limit)
        .all()
    )
    data = []
    for ps, p in rows:
        data.append({
            "payslip_id": ps.id,
            "month": p.month,
            "year": p.year,
            "net_salary": float(ps.net_salary) if ps.net_salary is not None else None,
            "gross_salary": float(ps.gross_salary) if ps.gross_salary is not None else None,
            "total_deduction": float(ps.total_deduction) if ps.total_deduction is not None else None,
            "status": ps.status,
        })
    return ok(data, "Lịch sử bảng lương.")


BANG_LUONG_TOOLS = [
    ToolSpec("danh_sach_ky_luong", "Liệt kê các kỳ lương.", DanhSachKyLuongArgs, danh_sach_ky_luong, "hrm"),
    ToolSpec("ky_luong", "Tra cứu 1 kỳ lương theo tháng/năm.", KyLuongArgs, ky_luong, "hrm"),
    ToolSpec("bang_luong_thang", "Tra cứu bảng lương theo tháng/năm.", BangLuongThangArgs, bang_luong_thang, "hrm"),
    ToolSpec("chi_tiet_bang_luong", "Chi tiết bảng lương theo payslip_id.", ChiTietBangLuongArgs, chi_tiet_bang_luong, "hrm"),
    ToolSpec("lich_su_bang_luong", "Lịch sử bảng lương của nhân viên.", LichSuBangLuongArgs, lich_su_bang_luong, "hrm"),
]
