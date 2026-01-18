# app/ai/plan_validator.py
from __future__ import annotations
from typing import Set, Dict, Any
from uuid import UUID

from app.ai.plan_schema import Plan
from app.core.errors import InvalidPlan
from app.ai.module_registry import get_tool
from app.core.role.tool_policies import TOOL_POLICIES
from app.core.role.scope_resolver import resolve_scope

SELF_ONLY_MSG = "Bạn chỉ được xem dữ liệu của chính mình, không được xem nhân viên khác."

def _is_placeholder(v: Any) -> bool:
    return isinstance(v, str) and "{{" in v and "}}" in v

def _get_policy(module: str, tool_name: str) -> dict | None:
    mod_block = TOOL_POLICIES.get(module)
    if isinstance(mod_block, dict) and tool_name in mod_block:
        return mod_block.get(tool_name)
    return TOOL_POLICIES.get(tool_name)

def validate_plan(plan: Plan, auth: Dict[str, Any], user_perms: Set[str]):
    if not plan.module:
        raise InvalidPlan("Thiếu module trong plan.")
    if plan.needs_clarification:
        return

    # ✅ Cho phép plan steps=[] nếu router cố ý trả final_response_template (SELF msg)
    if not plan.steps:
        if getattr(plan, "final_response_template", None):
            return
        raise InvalidPlan("Plan không có bước thực thi (steps rỗng).")

    role = auth.get("role")
    if not role:
        raise InvalidPlan("Bạn không có quyền truy cập chức năng này.")

    user_id = auth.get("user_id")
    employee_id = auth.get("employee_id")

    for step in plan.steps:
        a = step.args or {}

        tool = get_tool(plan.module, step.tool)
        if tool is None:
            raise InvalidPlan(f"Tool '{step.tool}' không tồn tại trong module '{plan.module}'.")

        policy = _get_policy(plan.module, step.tool)
        if not policy:
            raise InvalidPlan(f"Chức năng '{step.tool}' chưa được cấu hình quyền truy cập (policy).")

        # 1) resolve scope theo ROLE_SCOPE_MATRIX (tầng module/scope)
        scope = resolve_scope(role_name=role, module=plan.module, tool_name=step.tool)
        if scope == "NONE":
            raise InvalidPlan("Vai trò của bạn không được phép truy cập chức năng này trong module này.")

        # 2) Nếu scope SELF/DEPT mà tool/args đang nhắm người khác => ưu tiên SELF_ONLY_MSG
        if scope in ("SELF", "DEPT"):
            # HRM: tool xem người khác
            if step.tool in {"tim_nhan_vien", "thong_tin_nhan_vien", "thong_tin_nhan_vien_id"}:
                raise InvalidPlan(SELF_ONLY_MSG)

            # Nếu LLM nhét employee_code để xem người khác
            if "employee_code" in a and a.get("employee_code") and not _is_placeholder(a["employee_code"]):
                raise InvalidPlan(SELF_ONLY_MSG)

            # Nếu LLM nhét employee_id khác mình
            if "employee_id" in a and employee_id is not None and not _is_placeholder(a["employee_id"]):
                if a["employee_id"] not in (None, employee_id):
                    raise InvalidPlan(SELF_ONLY_MSG)

            # Nếu LLM nhét user_id khác mình
            if "user_id" in a and user_id is not None and not _is_placeholder(a["user_id"]):
                if a["user_id"] not in (None, user_id):
                    raise InvalidPlan(SELF_ONLY_MSG)

            # target_user_id
            if "target_user_id" in a and user_id is not None and not _is_placeholder(a["target_user_id"]):
                if a["target_user_id"] not in (None, user_id):
                    raise InvalidPlan(SELF_ONLY_MSG)

        # 3) allowed_scopes theo TOOL_POLICIES (tầng tool)
        allowed_scopes = policy.get("allowed_scopes", ["SELF"])
        effective_scope = scope if scope in allowed_scopes else policy.get("default_scope", "SELF")
        if effective_scope not in allowed_scopes:
            raise InvalidPlan("Bạn không có quyền truy cập chức năng này trong phạm vi hiện tại.")

        # 4) permission gating (chỉ check sau khi đã xử lý SELF-violation)
        required = set(policy.get("required_permissions", []) or [])
        if required and not required.issubset(user_perms):
            raise InvalidPlan("Bạn chưa được cấp quyền sử dụng chức năng này.")
