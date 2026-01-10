from __future__ import annotations

from datetime import date, timedelta
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok, can_lam_ro
from app.modules.hrm.models import LaborContract, Employee, Department
from .helpers import find_department_by_code


class HopDongHienTaiArgs(BaseModel):
    employee_id: int = Field(..., ge=1)


class LichSuHopDongArgs(BaseModel):
    employee_id: int = Field(..., ge=1)
    limit: int = Field(10, ge=1, le=50)


class HopDongSapHetHanArgs(BaseModel):
    days: int = Field(30, ge=1, le=365)
    department_code: str | None = Field(None, description="Mã phòng ban (vd: DP001). Nếu null => toàn công ty.")
    limit: int = Field(50, ge=1, le=200)


def hop_dong_hien_tai(session: Session, employee_id: int):
    r = (
        session.query(LaborContract)
        .filter(LaborContract.employee_id == int(employee_id), LaborContract.status == "ACTIVE")
        .order_by(LaborContract.start_date.desc())
        .first()
    )
    if not r:
        return can_lam_ro("Không có hợp đồng ACTIVE của nhân viên.", [])
    data = {
        "contract_id": r.id,
        "employee_id": r.employee_id,
        "contract_number": r.contract_number,
        "contract_type": r.contract_type,
        "start_date": str(r.start_date) if r.start_date else None,
        "end_date": str(r.end_date) if r.end_date else None,
        "basic_salary": float(r.basic_salary) if r.basic_salary is not None else None,
        "allowance_responsibility": float(r.allowance_responsibility) if r.allowance_responsibility is not None else None,
        "allowance_transport": float(r.allowance_transport) if r.allowance_transport is not None else None,
        "allowance_lunch": float(r.allowance_lunch) if r.allowance_lunch is not None else None,
        "status": r.status,
        "file_path": r.file_path,
    }
    return ok(data, "Hợp đồng hiện tại.")


def lich_su_hop_dong(session: Session, employee_id: int, limit: int = 10):
    rows = (
        session.query(LaborContract)
        .filter(LaborContract.employee_id == int(employee_id))
        .order_by(LaborContract.start_date.desc())
        .limit(limit)
        .all()
    )
    data = [{
        "contract_id": r.id,
        "contract_number": r.contract_number,
        "contract_type": r.contract_type,
        "start_date": str(r.start_date) if r.start_date else None,
        "end_date": str(r.end_date) if r.end_date else None,
        "status": r.status,
    } for r in rows]
    return ok(data, "Lịch sử hợp đồng.")


def hop_dong_sap_het_han(session: Session, days: int = 30, department_code: str | None = None, limit: int = 50):
    today = date.today()
    due = today + timedelta(days=int(days))

    q = (
        session.query(LaborContract, Employee, Department)
        .join(Employee, Employee.id == LaborContract.employee_id)
        .join(Department, Department.id == Employee.department_id, isouter=True)
        .filter(LaborContract.status == "ACTIVE")
        .filter(LaborContract.end_date.isnot(None))
        .filter(LaborContract.end_date >= today)
        .filter(LaborContract.end_date <= due)
    )

    if department_code:
        dept = find_department_by_code(session, department_code)
        if not dept:
            return can_lam_ro("Không tìm thấy phòng ban theo mã.", [])
        q = q.filter(Employee.department_id == dept.id)

    rows = q.order_by(LaborContract.end_date.asc()).limit(limit).all()
    data = []
    for c, e, d in rows:
        data.append({
            "contract_id": c.id,
            "contract_number": c.contract_number,
            "employee_id": e.id,
            "employee_code": getattr(e, "employee_code", None),
            "full_name": getattr(e, "full_name", None),
            "department_code": getattr(d, "code", None) if d else None,
            "department_name": getattr(d, "name", None) if d else None,
            "end_date": str(c.end_date) if c.end_date else None,
            "days_left": (c.end_date - today).days if c.end_date else None,
        })
    return ok({"from": str(today), "to": str(due), "rows": data}, "Danh sách hợp đồng sắp hết hạn.")


HOP_DONG_TOOLS = [
    ToolSpec("hop_dong_hien_tai", "Tra cứu hợp đồng lao động ACTIVE.", HopDongHienTaiArgs, hop_dong_hien_tai, "hrm"),
    ToolSpec("lich_su_hop_dong", "Lịch sử hợp đồng lao động.", LichSuHopDongArgs, lich_su_hop_dong, "hrm"),
    ToolSpec("hop_dong_sap_het_han", "Danh sách hợp đồng sắp hết hạn theo khoảng ngày.", HopDongSapHetHanArgs, hop_dong_sap_het_han, "hrm"),
]
