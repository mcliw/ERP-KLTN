# app/ai/executor/context_injection.py
from __future__ import annotations

from typing import Any, Dict
from uuid import UUID

_PLACEHOLDERS = {
    "CUSTOMER_ID", "USER_ID", "ME", "SELF", "CURRENT_USER", "AUTH_USER_ID",
    "YOUR_USER_ID", "MY_ID",
}

def _is_placeholder(v: Any) -> bool:
    return isinstance(v, str) and v.strip().upper() in _PLACEHOLDERS

def _inject_recursively(obj: Any, auth_user_id: UUID) -> Any:
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            if k in {"target_user_id", "user_id", "customer_id"}:
                if v is None or _is_placeholder(v):
                    out[k] = auth_user_id
                else:
                    out[k] = _inject_recursively(v, auth_user_id)
            else:
                out[k] = _inject_recursively(v, auth_user_id)
        return out
    if isinstance(obj, list):
        return [_inject_recursively(x, auth_user_id) for x in obj]
    return obj

def inject_auth_into_args(
    *,
    auth_user_id: UUID | None,
    tool_args: Dict[str, Any] | None,
    has_target_user_id_field: bool,
    **_: Any,  # <- NUỐT THAM SỐ THỪA (message, role, ...)
) -> Dict[str, Any]:
    args = dict(tool_args or {})
    if not auth_user_id:
        return args

    args = _inject_recursively(args, auth_user_id)

    if has_target_user_id_field:
        if ("target_user_id" not in args) or (args.get("target_user_id") is None) or _is_placeholder(args.get("target_user_id")):
            args["target_user_id"] = auth_user_id

    return args
