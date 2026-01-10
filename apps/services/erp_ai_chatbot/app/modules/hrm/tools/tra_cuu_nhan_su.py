from __future__ import annotations

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok, can_lam_ro
from app.modules.hrm.models import Employee, Department, Position
from .helpers import find_employee_by_user_id, find_employee_exact_code, find_employees, find_employee


class TimNhanVienArgs(BaseModel):
    tu_khoa: str = Field(..., description="Mã nhân viên / tên / id")


class ThongTinNhanVienArgs(BaseModel):
    employee_code: str = Field(..., description="Mã nhân viên (vd: NV001)")


class ThongTinNhanVienIdArgs(BaseModel):
    employee_id: int = Field(..., ge=1)


class ThongTinNhanVienTheoUserArgs(BaseModel):
    user_id: int = Field(..., ge=1, description="user_id từ backend auth context")


def _card(emp: Employee, dept: Department | None, pos: Position | None):
    return {
        "employee_id": emp.id,
        "user_id": getattr(emp, "user_id", None),
        "employee_code": getattr(emp, "employee_code", None),
        "full_name": getattr(emp, "full_name", None),
        "status": getattr(emp, "status", None),
        "department_id": getattr(emp, "department_id", None),
        "department_code": getattr(dept, "code", None) if dept else None,
        "department_name": getattr(dept, "name", None) if dept else None,
        "position_id": getattr(emp, "position_id", None),
        "position_title": getattr(pos, "title", None) if pos else None,
        "phone": getattr(emp, "phone", None),
        "email_company": getattr(emp, "email_company", None),
        "join_date": str(getattr(emp, "join_date", None)) if getattr(emp, "join_date", None) else None,
        "resign_date": str(getattr(emp, "resign_date", None)) if getattr(emp, "resign_date", None) else None,
    }


def tim_nhan_vien(session: Session, tu_khoa: str):
    rows = find_employees(session, tu_khoa, limit=10)
    if not rows:
        return can_lam_ro("Không tìm thấy nhân viên theo từ khoá.", [])

    # nếu đúng 1 người => trả thẳng card
    if len(rows) == 1:
        e = rows[0]
        dept = session.query(Department).filter(Department.id == e.department_id).first() if e.department_id else None
        pos = session.query(Position).filter(Position.id == e.position_id).first() if e.position_id else None
        return ok(_card(e, dept, pos), "Tìm thấy nhân viên.")

    # nhiều kết quả => trả candidates
    data = [{
        "employee_id": e.id,
        "employee_code": getattr(e, "employee_code", None),
        "full_name": getattr(e, "full_name", None),
        "department_id": getattr(e, "department_id", None),
        "position_id": getattr(e, "position_id", None),
    } for e in rows]

    candidates = [{"employee_code": x.get("employee_code"), "full_name": x.get("full_name")} for x in data]
    return can_lam_ro("Tìm thấy nhiều nhân viên. Hãy chọn đúng mã nhân viên.", candidates)


def thong_tin_nhan_vien(session: Session, employee_code: str):
    e = find_employee_exact_code(session, employee_code)
    if not e:
        return can_lam_ro("Không tìm thấy nhân viên theo mã.", [])
    dept = session.query(Department).filter(Department.id == e.department_id).first() if e.department_id else None
    pos = session.query(Position).filter(Position.id == e.position_id).first() if e.position_id else None
    return ok(_card(e, dept, pos), "Thông tin nhân viên.")


def thong_tin_nhan_vien_id(session: Session, employee_id: int):
    e = session.query(Employee).filter(Employee.id == int(employee_id)).first()
    if not e:
        return can_lam_ro("Không tìm thấy nhân viên theo id.", [])
    dept = session.query(Department).filter(Department.id == e.department_id).first() if e.department_id else None
    pos = session.query(Position).filter(Position.id == e.position_id).first() if e.position_id else None
    return ok(_card(e, dept, pos), "Thông tin nhân viên.")


def thong_tin_nhan_vien_theo_user(session: Session, user_id: int):
    e = find_employee_by_user_id(session, user_id)
    if not e:
        return can_lam_ro("Không tìm thấy nhân viên theo user_id (chưa map user_id -> employee).", [])
    dept = session.query(Department).filter(Department.id == e.department_id).first() if e.department_id else None
    pos = session.query(Position).filter(Position.id == e.position_id).first() if e.position_id else None
    return ok(_card(e, dept, pos), "Thông tin nhân viên theo user_id.")


NHAN_SU_TOOLS = [
    ToolSpec("tim_nhan_vien", "Tìm nhân viên theo mã/tên/id.", TimNhanVienArgs, tim_nhan_vien, "hrm"),
    ToolSpec("thong_tin_nhan_vien", "Xem hồ sơ nhân viên theo mã.", ThongTinNhanVienArgs, thong_tin_nhan_vien, "hrm"),
    ToolSpec("thong_tin_nhan_vien_id", "Xem hồ sơ nhân viên theo id.", ThongTinNhanVienIdArgs, thong_tin_nhan_vien_id, "hrm"),
    ToolSpec("thong_tin_nhan_vien_theo_user", "Xem hồ sơ nhân viên theo user_id (tự động lấy nhân viên của bạn).", ThongTinNhanVienTheoUserArgs, thong_tin_nhan_vien_theo_user, "hrm"),
]
