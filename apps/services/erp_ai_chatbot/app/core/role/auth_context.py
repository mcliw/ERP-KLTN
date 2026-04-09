# app/core/role/auth_context.py
from __future__ import annotations

from typing import Set
from uuid import UUID

from pydantic import BaseModel, Field
from sqlalchemy import text

from app.db.identity_database import IdentitySessionLocal
from app.db.hrm_database import HrmSessionLocal


class AuthContext(BaseModel):
    user_id: UUID | None = None
    role: str | None = None
    is_authenticated: bool = False
    permissions: Set[str] = Field(default_factory=set)

    employee_id: int | None = None
    dept_id: int | None = None


def build_auth_context(user_id: UUID | None) -> AuthContext:
    if not user_id:
        return AuthContext(user_id=None, role=None, is_authenticated=False)

    from app.core.role.rbac import get_role_and_permissions

    with IdentitySessionLocal() as s:
        role_name, perms = get_role_and_permissions(s, user_id)

    employee_id = None
    dept_id = None
    with HrmSessionLocal() as hs:
        row = hs.execute(
            text("""
                SELECT employee_id AS employee_id, department_id AS dept_id
                FROM employees
                WHERE account_id = :uid
                LIMIT 1
            """),
            {"uid": user_id},
        ).fetchone()

        if row:
            employee_id, dept_id = row[0], row[1]

    return AuthContext(
        user_id=user_id,
        role=role_name,
        permissions=set(perms or []),
        is_authenticated=(role_name is not None),
        employee_id=employee_id,
        dept_id=dept_id,
    )
