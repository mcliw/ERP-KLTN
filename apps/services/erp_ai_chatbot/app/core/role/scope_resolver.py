# app/core/role/scope_resolver.py
from __future__ import annotations
from app.core.role.scope_matrix import ROLE_SCOPE_MATRIX

def resolve_scope(role_name: str | None, module: str, tool_name: str | None = None) -> str:
    """
    Trả về: 'SELF' | 'DEPT' | 'ALL' | 'NONE'
    tool_name hiện chưa dùng ở đây (để sau bạn kết hợp allowed_scopes/default_scope theo TOOL_POLICIES).
    """
    if not role_name:
        return "NONE"

    role_map = ROLE_SCOPE_MATRIX.get(role_name, {})
    scope = role_map.get(module) or role_map.get("*") or "NONE"
    return scope
