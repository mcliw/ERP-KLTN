from __future__ import annotations

from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok, can_lam_ro

# DB HRM mới: payslips
from app.modules.hrm.models import Payslip


class DanhSachKyLuongArgs(BaseModel):
    year: int | None = Field(None, ge=2000, le=2100)
    status: str | None = Field(None, description="(Bỏ qua) DB mới không có trạng thái kỳ lương")
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
    q = session.query(Payslip.year, Payslip.month).distinct()
    if year:
        q = q.filter(Payslip.year == int(year))

    rows = q.order_by(Payslip.year.desc(), Payslip.month.desc()).limit(int(limit)).all()

    data = []
    for y, m in rows:
        period_id = int(y) * 100 + int(m)
        data.append(
            {
                "payroll_period_id": period_id,
                "name": f"Kỳ lương {int(m):02d}/{int(y)}",
                "month": int(m),
                "year": int(y),
                "start_date": None,
                "end_date": None,
                "standard_working_days": None,
                "status": None,
            }
        )

    return ok(data, "Danh sách kỳ lương (từ payslips).")


def ky_luong(session: Session, month: int, year: int):
    r = (
        session.query(
            func.avg(func.coalesce(Payslip.standard_work_days, 0)).label("standard_work_days"),
            func.count(Payslip.payslip_id).label("total_employees"),
        )
        .filter(Payslip.month == int(month), Payslip.year == int(year))
        .first()
    )

    if not r or int(getattr(r, "total_employees", 0) or 0) == 0:
        return can_lam_ro("Không tìm thấy kỳ lương theo tháng/năm (chưa có payslip).", [])

    period_id = int(year) * 100 + int(month)
    data = {
        "payroll_period_id": period_id,
        "name": f"Kỳ lương {int(month):02d}/{int(year)}",
        "month": int(month),
        "year": int(year),
        "start_date": None,
        "end_date": None,
        "status": None,
        "standard_working_days": float(getattr(r, "standard_work_days", 0) or 0) if getattr(r, "standard_work_days", None) is not None else None,
        "total_employees": int(getattr(r, "total_employees", 0) or 0),
        "note": "DB mới không có bảng payroll_period; kỳ lương được suy ra từ payslips.",
    }
    return ok(data, "Kỳ lương.")


def bang_luong_thang(session: Session, employee_id: int, month: int, year: int):
    ps = (
        session.query(Payslip)
        .filter(Payslip.employee_id == int(employee_id), Payslip.month == int(month), Payslip.year == int(year))
        .first()
    )
    if not ps:
        return can_lam_ro("Không có bảng lương của nhân viên trong kỳ này.", [])

    data = {
        "payslip_id": getattr(ps, "payslip_id", None) or getattr(ps, "id", None),
        "employee_id": ps.employee_id,
        "month": ps.month,
        "year": ps.year,
        "standard_work_days": float(getattr(ps, "standard_work_days", 0) or 0) if getattr(ps, "standard_work_days", None) is not None else None,
        "actual_work_days": float(getattr(ps, "actual_work_days", 0) or 0) if getattr(ps, "actual_work_days", None) is not None else None,
        "leave_paid_days": float(getattr(ps, "leave_paid_days", 0) or 0) if getattr(ps, "leave_paid_days", None) is not None else None,
        "gross_salary": float(getattr(ps, "gross_salary", 0) or 0) if getattr(ps, "gross_salary", None) is not None else None,
        "tax_deduction": float(getattr(ps, "tax_deduction", 0) or 0),
        "insurance_deduction": float(getattr(ps, "insurance_deduction", 0) or 0),
        "advance_payment": float(getattr(ps, "advance_payment", 0) or 0),
        "net_salary": float(getattr(ps, "net_salary", 0) or 0) if getattr(ps, "net_salary", None) is not None else None,
        "status": bool(getattr(ps, "status", False)),
        "created_at": ps.created_at.isoformat() if getattr(ps, "created_at", None) else None,
    }

    return ok(data, "Bảng lương theo tháng.")


def chi_tiet_bang_luong(session: Session, payslip_id: int):
    id_col = getattr(Payslip, "payslip_id", None) or getattr(Payslip, "id", None)
    ps = session.query(Payslip).filter(id_col == int(payslip_id)).first()
    if not ps:
        return can_lam_ro("Không tìm thấy payslip theo payslip_id.", [])

    gross = float(getattr(ps, "gross_salary", 0) or 0) if getattr(ps, "gross_salary", None) is not None else 0.0
    tax = float(getattr(ps, "tax_deduction", 0) or 0)
    ins = float(getattr(ps, "insurance_deduction", 0) or 0)
    adv = float(getattr(ps, "advance_payment", 0) or 0)
    net = float(getattr(ps, "net_salary", 0) or 0) if getattr(ps, "net_salary", None) is not None else None

    lines = [
        {"code": "GROSS", "name": "Lương gross", "type": "EARNING", "amount": gross},
        {"code": "TAX", "name": "Khấu trừ thuế", "type": "DEDUCTION", "amount": tax},
        {"code": "INSURANCE", "name": "Khấu trừ bảo hiểm", "type": "DEDUCTION", "amount": ins},
        {"code": "ADVANCE", "name": "Tạm ứng", "type": "DEDUCTION", "amount": adv},
    ]

    total_allowance = 0.0
    total_deduction = tax + ins + adv

    return ok(
        {
            "payslip_id": int(payslip_id),
            "employee_id": ps.employee_id,
            "month": ps.month,
            "year": ps.year,
            "total_allowance": float(total_allowance),
            "total_deduction": float(total_deduction),
            "net_salary": float(net) if net is not None else None,
            "lines": lines,
            "note": "DB mới không có payslip_detail/salary_rule; chi tiết được tổng hợp từ các cột trên payslips.",
        },
        "Chi tiết bảng lương.",
    )


def lich_su_bang_luong(session: Session, employee_id: int, limit: int = 6):
    rows = (
        session.query(Payslip)
        .filter(Payslip.employee_id == int(employee_id))
        .order_by(Payslip.year.desc(), Payslip.month.desc())
        .limit(int(limit))
        .all()
    )

    data = []
    for ps in rows:
        data.append(
            {
                "payslip_id": getattr(ps, "payslip_id", None) or getattr(ps, "id", None),
                "month": ps.month,
                "year": ps.year,
                "net_salary": float(getattr(ps, "net_salary", 0) or 0) if getattr(ps, "net_salary", None) is not None else None,
                "gross_salary": float(getattr(ps, "gross_salary", 0) or 0) if getattr(ps, "gross_salary", None) is not None else None,
                "tax_deduction": float(getattr(ps, "tax_deduction", 0) or 0),
                "insurance_deduction": float(getattr(ps, "insurance_deduction", 0) or 0),
                "advance_payment": float(getattr(ps, "advance_payment", 0) or 0),
                "status": bool(getattr(ps, "status", False)),
            }
        )

    return ok(data, "Lịch sử bảng lương.")


BANG_LUONG_TOOLS = [
    ToolSpec("danh_sach_ky_luong", "Liệt kê các kỳ lương (từ payslips).", DanhSachKyLuongArgs, danh_sach_ky_luong, "hrm"),
    ToolSpec("ky_luong", "Tra cứu 1 kỳ lương theo tháng/năm (từ payslips).", KyLuongArgs, ky_luong, "hrm"),
    ToolSpec("bang_luong_thang", "Tra cứu bảng lương theo tháng/năm.", BangLuongThangArgs, bang_luong_thang, "hrm"),
    ToolSpec("chi_tiet_bang_luong", "Chi tiết bảng lương theo payslip_id (tổng hợp).", ChiTietBangLuongArgs, chi_tiet_bang_luong, "hrm"),
    ToolSpec("lich_su_bang_luong", "Lịch sử bảng lương của nhân viên.", LichSuBangLuongArgs, lich_su_bang_luong, "hrm"),
]
