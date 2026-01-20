from __future__ import annotations

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok, can_lam_ro

from app.modules.hrm.models import SalaryContract, Employee, Department
from .helpers import find_department_by_code


class HopDongHienTaiArgs(BaseModel):
    employee_id: int = Field(..., ge=1)


class LichSuHopDongArgs(BaseModel):
    employee_id: int = Field(..., ge=1)
    limit: int = Field(10, ge=1, le=50)


class HopDongDangHieuLucTheoPhongBanArgs(BaseModel):
    """Thay thế cho 'hợp đồng sắp hết hạn' vì schema mới không lưu end_date."""

    department_code: str | None = Field(None, description="Mã phòng ban (vd: FIN, HR, IT...). Nếu null => toàn công ty.")
    limit: int = Field(50, ge=1, le=200)


def hop_dong_hien_tai(session: Session, employee_id: int):
    q = session.query(SalaryContract).filter(SalaryContract.employee_id == int(employee_id), SalaryContract.is_active == True)  # noqa: E712
    r = q.order_by(SalaryContract.effective_date.desc(), SalaryContract.created_at.desc()).first()
    if not r:
        return can_lam_ro("Không có salary_contract đang ACTIVE của nhân viên.", [])

    data = {
        "contract_id": getattr(r, "contract_id", None) or getattr(r, "id", None),
        "employee_id": r.employee_id,
        "base_salary": float(getattr(r, "base_salary", 0) or 0),
        "allowance": float(getattr(r, "allowance", 0) or 0),
        "insurance_salary": float(getattr(r, "insurance_salary", 0) or 0) if getattr(r, "insurance_salary", None) is not None else None,
        "effective_date": str(getattr(r, "effective_date", None)) if getattr(r, "effective_date", None) else None,
        "is_active": bool(getattr(r, "is_active", False)),
        "created_at": r.created_at.isoformat() if getattr(r, "created_at", None) else None,
    }
    return ok(data, "Hợp đồng lương hiện tại (salary_contracts).")


def lich_su_hop_dong(session: Session, employee_id: int, limit: int = 10):
    rows = (
        session.query(SalaryContract)
        .filter(SalaryContract.employee_id == int(employee_id))
        .order_by(SalaryContract.effective_date.desc(), SalaryContract.created_at.desc())
        .limit(int(limit))
        .all()
    )

    data = []
    for r in rows:
        data.append(
            {
                "contract_id": getattr(r, "contract_id", None) or getattr(r, "id", None),
                "effective_date": str(getattr(r, "effective_date", None)) if getattr(r, "effective_date", None) else None,
                "base_salary": float(getattr(r, "base_salary", 0) or 0),
                "allowance": float(getattr(r, "allowance", 0) or 0),
                "insurance_salary": float(getattr(r, "insurance_salary", 0) or 0) if getattr(r, "insurance_salary", None) is not None else None,
                "is_active": bool(getattr(r, "is_active", False)),
                "created_at": r.created_at.isoformat() if getattr(r, "created_at", None) else None,
            }
        )

    return ok(data, "Lịch sử hợp đồng lương (salary_contracts).")


def hop_dong_dang_hieu_luc_theo_phong_ban(session: Session, department_code: str | None = None, limit: int = 50):
    # Liệt kê nhân viên có salary_contract is_active=true, kèm phòng ban.
    emp_id_col = getattr(Employee, "employee_id", None) or getattr(Employee, "id", None)
    dept_id_col = getattr(Department, "department_id", None) or getattr(Department, "id", None)

    q = (
        session.query(SalaryContract, Employee, Department)
        .join(Employee, emp_id_col == SalaryContract.employee_id)
        .join(Department, dept_id_col == Employee.department_id, isouter=True)
        .filter(SalaryContract.is_active == True)  # noqa: E712
    )

    if department_code:
        dept = find_department_by_code(session, department_code)
        if not dept:
            return can_lam_ro("Không tìm thấy phòng ban theo mã.", [])
        q = q.filter(Employee.department_id == (getattr(dept, "department_id", None) or getattr(dept, "id", None)))

    rows = q.order_by(Department.code.asc().nullslast(), Employee.employee_code.asc()).limit(int(limit)).all()

    data = []
    for c, e, d in rows:
        data.append(
            {
                "employee_id": getattr(e, "employee_id", None) or getattr(e, "id", None),
                "employee_code": getattr(e, "employee_code", None),
                "full_name": getattr(e, "full_name", None),
                "department_code": getattr(d, "code", None) if d else None,
                "department_name": getattr(d, "name", None) if d else None,
                "contract_id": getattr(c, "contract_id", None) or getattr(c, "id", None),
                "effective_date": str(getattr(c, "effective_date", None)) if getattr(c, "effective_date", None) else None,
                "base_salary": float(getattr(c, "base_salary", 0) or 0),
                "allowance": float(getattr(c, "allowance", 0) or 0),
            }
        )

    return ok(data, "Danh sách nhân viên có hợp đồng lương đang hiệu lực theo phòng ban.")


HOP_DONG_TOOLS = [
    ToolSpec("hop_dong_hien_tai", "Tra cứu hợp đồng lương đang hiệu lực (salary_contracts.is_active=true).", HopDongHienTaiArgs, hop_dong_hien_tai, "hrm"),
    ToolSpec("lich_su_hop_dong", "Lịch sử hợp đồng lương (salary_contracts).", LichSuHopDongArgs, lich_su_hop_dong, "hrm"),
    ToolSpec("hop_dong_dang_hieu_luc_theo_phong_ban", "Danh sách nhân viên có hợp đồng lương đang hiệu lực theo phòng ban.", HopDongDangHieuLucTheoPhongBanArgs, hop_dong_dang_hieu_luc_theo_phong_ban, "hrm"),
]
