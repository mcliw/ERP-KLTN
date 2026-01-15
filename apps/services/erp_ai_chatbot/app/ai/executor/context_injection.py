from __future__ import annotations

from typing import Any, Dict, Optional

SELF_MARKERS = [
    "của tôi", "của mình", "tôi", "mình",
    "my", "me", "mine",
]

BAD_TARGET_MARKERS = {
    None, "", "CUSTOMER_ID", "USER_ID", "MY_ID", "ME", "SELF",
    "customer_id", "user_id", "my_id",
}

def _is_int_like(x: Any) -> bool:
    if isinstance(x, int):
        return True
    if isinstance(x, str) and x.strip().isdigit():
        return True
    return False

def _should_self_scope(message: str, role: Optional[str]) -> bool:
    msg = (message or "").lower()

    # role khách/nhân viên: luôn scope về chính họ (thực tế)
    if (role or "").upper() in {"CUSTOMER", "EMPLOYEE"}:
        return True

    # admin: chỉ scope khi có dấu hiệu "của tôi"
    return any(m in msg for m in SELF_MARKERS)

def inject_auth_into_args(
    message: str,
    role: str | None,
    auth_user_id: int | None,
    tool_args: dict,
    has_target_user_id_field: bool,
):
    if not has_target_user_id_field or not auth_user_id:
        return tool_args

    msg = (message or "").lower()
    is_self_query = any(k in msg for k in ["của tôi", "tôi", "my ", "me "])

    if not is_self_query:
        return tool_args

    v = tool_args.get("target_user_id", None)

    placeholder = isinstance(v, str) and v.strip().upper() in {"CUSTOMER_ID", "USER_ID", "ME", "SELF"}
    not_a_number = isinstance(v, str) and not v.strip().isdigit()

    if v is None or placeholder or not_a_number:
        tool_args["target_user_id"] = auth_user_id

    return tool_args
