from __future__ import annotations

import re
from datetime import date, datetime, timedelta
from typing import List, Optional, Tuple

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.modules.hrm.models import Employee, Department


_EMP_CODE_RE = re.compile(r"^[A-Z]{0,4}\d{1,10}$", re.IGNORECASE)


def _norm(s: str) -> str:
    return (s or "").strip()


def find_employee_by_user_id(session: Session, user_id: int) -> Optional[Employee]:
    if user_id is None:
        return None
    return session.query(Employee).filter(Employee.user_id == int(user_id)).first()


def find_employee_exact_code(session: Session, employee_code: str) -> Optional[Employee]:
    code = _norm(employee_code).upper()
    if not code:
        return None
    return session.query(Employee).filter(func.upper(Employee.employee_code) == code).first()


def find_employee(session: Session, tu_khoa: str) -> Optional[Employee]:
    kw = _norm(tu_khoa)
    if not kw:
        return None

    # numeric => id
    if kw.isdigit():
        return session.query(Employee).filter(Employee.id == int(kw)).first()

    # looks like code => try exact employee_code
    if _EMP_CODE_RE.match(kw):
        emp = find_employee_exact_code(session, kw)
        if emp:
            return emp

    # fallback: name contains
    q = session.query(Employee).filter(func.lower(Employee.full_name).like(f"%{kw.lower()}%"))
    return q.order_by(Employee.id.asc()).first()


def find_employees(session: Session, tu_khoa: str, limit: int = 10) -> List[Employee]:
    kw = _norm(tu_khoa)
    if not kw:
        return []

    if kw.isdigit():
        emp = session.query(Employee).filter(Employee.id == int(kw)).first()
        return [emp] if emp else []

    # prefer exact code hit first
    if _EMP_CODE_RE.match(kw):
        emp = find_employee_exact_code(session, kw)
        if emp:
            return [emp]

    q = session.query(Employee).filter(
        or_(
            func.lower(Employee.full_name).like(f"%{kw.lower()}%"),
            func.lower(Employee.employee_code).like(f"%{kw.lower()}%"),
        )
    )
    return q.order_by(Employee.id.asc()).limit(max(1, min(limit, 50))).all()


def find_department_by_code(session: Session, department_code: str) -> Optional[Department]:
    code = _norm(department_code).upper()
    if not code:
        return None
    return session.query(Department).filter(func.upper(Department.code) == code).first()
