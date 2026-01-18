from __future__ import annotations
from typing import Any, Dict, Set, Tuple
from copy import deepcopy

from app.core.errors import PermissionDenied

def check_required_permissions(user_perms: Set[str], required: Set[str]) -> None:
    if required and not required.issubset(user_perms):
        raise PermissionDenied("Bạn không có quyền truy cập chức năng này.")

def sanitize_args_by_scope(args: Dict[str, Any], scope: str, auth: Dict[str, Any]) -> Dict[str, Any]:
    a = deepcopy(args or {})
    if scope == "SELF":
        # HRM hay dùng employee_id / approver_id
        if "employee_id" in a and auth.get("employee_id") is not None:
            a["employee_id"] = auth["employee_id"]
        if "approver_id" in a and auth.get("employee_id") is not None:
            a["approver_id"] = auth["employee_id"]

        # các tool kiểu user_id/target_user_id
        if "user_id" in a and auth.get("user_id") is not None:
            a["user_id"] = auth["user_id"]
        if "target_user_id" in a and auth.get("user_id") is not None:
            a["target_user_id"] = auth["user_id"]

    return a

def apply_field_policy(result: Dict[str, Any], policy: Dict[str, Any]) -> Dict[str, Any]:
    """
    policy = {"allow": ["*"] | [field...], "mask": [field...]}
    Áp dụng lên result["data"] (dict hoặc list[dict]).
    mask sẽ strip theo kiểu đệ quy để tránh lộ field nhạy cảm trong nested object.
    """
    if not isinstance(result, dict):
        return result

    data = result.get("data")
    if data is None or not isinstance(policy, dict) or not policy:
        return result

    allow = policy.get("allow") or ["*"]
    mask = set(policy.get("mask") or [])

    def strip_mask(obj: Any):
        if isinstance(obj, dict):
            return {k: strip_mask(v) for k, v in obj.items() if k not in mask}
        if isinstance(obj, list):
            return [strip_mask(x) for x in obj]
        return obj

    def apply_allow(obj: Any):
        if allow == ["*"]:
            return obj
        allow_set = set(allow)
        if isinstance(obj, dict):
            return {k: obj.get(k) for k in obj.keys() if k in allow_set}
        if isinstance(obj, list):
            return [apply_allow(x) for x in obj]
        return obj

    new_result = dict(result)
    filtered = apply_allow(data)
    filtered = strip_mask(filtered)
    new_result["data"] = filtered
    return new_result
