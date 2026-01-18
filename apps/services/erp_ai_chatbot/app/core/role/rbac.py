# app/core/role/rbac.py
from __future__ import annotations

from typing import Set, Tuple, TYPE_CHECKING
from sqlalchemy import text
from sqlalchemy.orm import Session
from uuid import UUID
from app.core.role.scope_resolver import resolve_scope

if TYPE_CHECKING:
    from app.core.role.auth_context import AuthContext


def get_role_and_permissions(identity_session: Session, user_id: UUID) -> Tuple[str | None, Set[str]]:
    q = text("""
        SELECT r.name AS role_name, p.code AS perm_code
        FROM users u
        JOIN roles r ON r.id = u.role_id
        LEFT JOIN role_permissions rp ON rp.role_id = r.id
        LEFT JOIN permissions p ON p.id = rp.permission_id
        WHERE u.id = :user_id
    """)
    rows = identity_session.execute(q, {"user_id": user_id}).fetchall()
    if not rows:
        return None, set()

    role_name = rows[0][0]
    perms = {row[1] for row in rows if row[1] is not None}
    return role_name, perms

def check_role(module: str, auth: AuthContext) -> bool:
    """
    Gate sớm ở cấp module:
    - chỉ chặn khi chưa auth hoặc scope == NONE
    - KHÔNG chặn theo permission ở đây (để validate_plan/executor xử lý theo TOOL_POLICIES)
    """
    if not auth.is_authenticated or not auth.role:
        return False

    scope = resolve_scope(role_name=auth.role, module=module, tool_name="__module__")
    return scope != "NONE"
