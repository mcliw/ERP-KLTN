from __future__ import annotations

import re
from uuid import UUID
from typing import Any, Dict, Optional, List

from app.ai.router import plan_route
from app.ai.plan_validator import validate_plan
from app.ai.module_registry import get_tool
from app.ai.tooling import ToolSpec
from app.ai.answer_composer import compose_answer_with_llm, compose_safe_enough
from app.ai.executor.context_injection import inject_auth_into_args
from app.ai.llm_payload_filter import filter_step_infos_for_llm

from app.db.sale_crm_database import SaleCrmSessionLocal

from app.core.audit_log import audit
from app.core.errors import PermissionDenied, ToolExecutionError

from app.core.role.auth_context import build_auth_context
from app.core.role.rbac import check_role
from app.core.role.tool_policies import TOOL_POLICIES
from app.core.role.scope_resolver import resolve_scope
from app.core.role.enforcer import (
    check_required_permissions,
    sanitize_args_by_scope,
    apply_field_policy,
)

def _fmt_money(v: Any) -> str:
    try:
        n = float(v or 0)
        return f"{n:,.0f}".replace(",", ".") + " VNĐ"
    except Exception:
        return str(v)

def _args_has_target_user_id_field(tool) -> bool:
    # tool.args_model là Pydantic model class
    m = getattr(tool, "args_model", None)
    fields = getattr(m, "model_fields", None)
    return bool(fields) and ("target_user_id" in fields)

# =========================
# Filter tool outputs gửi cho LLM (để không lôi PII/không lan man)
# =========================
CONTEXT_ONLY_TOOLS_BY_MODULE: dict[str, set[str]] = {
    "sale_crm": {"tim_khach_hang", "ho_so_khach_hang", "danh_sach_dia_chi"},
}

_CUSTOMER_PROFILE_KW = re.compile(
    r"(thông tin|hồ sơ|profile|tài khoản|địa chỉ|sđt|điện thoại|email|cá nhân|liên hệ)",
    re.IGNORECASE,
)

def _wants_customer_profile(message: str) -> bool:
    return bool(_CUSTOMER_PROFILE_KW.search(message or ""))

def _filter_step_infos_for_compose(module: str, message: str, step_infos: list[dict]) -> list[dict]:
    suppress = CONTEXT_ONLY_TOOLS_BY_MODULE.get(module, set())
    if module == "sale_crm" and not _wants_customer_profile(message):
        return [si for si in step_infos if si.get("tool") not in suppress]
    return step_infos

def _filter_step_infos_for_answer(module: str, message: str, step_infos: list[dict]) -> list[dict]:
    suppress = CONTEXT_ONLY_TOOLS_BY_MODULE.get(module, set())
    if module == "sale_crm" and not _wants_customer_profile(message):
        return [si for si in step_infos if si.get("tool") not in suppress]
    return step_infos

# =========================
# Placeholder/Template utils (giữ giống executor_hrm)
# =========================
FULL_TPL_RE = re.compile(r"^\s*\{\{\s*([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+|\[[0-9]+\])*)\s*\}\}\s*$")
VAR_DBL_RE = re.compile(r"\{\{\s*([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+|\[[0-9]+\])*)\s*\}\}")

class UnresolvedRefError(Exception):
    pass

def _get_path(store: dict, path: str):
    cur: Any = store
    for part in path.split("."):
        m = re.match(r"^([a-zA-Z0-9_]+)(\[[0-9]+\])?$", part)
        if not m:
            raise KeyError(path)

        key = m.group(1)
        idx = int(m.group(2)[1:-1]) if m.group(2) else None

        # 1) cur là dict => truy cập key bình thường
        if isinstance(cur, dict):
            cur = cur[key]

        # 2) cur là list nhưng LLM lỡ viết ".data[0]" (trong khi save_as là list)
        elif isinstance(cur, list):
            if key in ("data", "items", "rows", "results"):
                # coi ".data" như identity của list
                pass
            else:
                raise KeyError(f"{path} (cannot access key '{key}' on list)")

        else:
            raise KeyError(f"{path} (unexpected type {type(cur).__name__})")

        # apply index nếu có
        if idx is not None:
            if not isinstance(cur, list):
                raise KeyError(f"{path} (index on non-list)")
            if idx < 0 or idx >= len(cur):
                raise IndexError(f"{path} (index {idx} out of range; len={len(cur)})")
            cur = cur[idx]

    return cur

def _render_value(tpl: str, store: dict):
    tpl = tpl or ""

    m = FULL_TPL_RE.match(tpl)
    if m:
        path = m.group(1)
        try:
            return _get_path(store, path)
        except Exception:
            m2 = re.match(r"^(s[0-9]+)\.(.+)$", path)
            if m2:
                step_id = m2.group(1)
                rest = m2.group(2)
                return _get_path(store, f"{step_id}.data.{rest}")
            raise

    def repl(mm):
        path = mm.group(1)
        try:
            val = _get_path(store, path)
            return "" if val is None else str(val)
        except Exception:
            m2 = re.match(r"^(s[0-9]+)\.(.+)$", path)
            if m2:
                step_id = m2.group(1)
                rest = m2.group(2)
                val = _get_path(store, f"{step_id}.data.{rest}")
                return "" if val is None else str(val)
            return mm.group(0)

    return VAR_DBL_RE.sub(repl, tpl)

def _normalize_ref(s: str) -> str:
    s = (s or "").strip()

    # ${var.path}
    m = re.fullmatch(r"\$\{\s*([A-Za-z_]\w*(?:\[[0-9]+\]|\.[A-Za-z_]\w*)*)\s*\}", s)
    if m:
        return "{{" + m.group(1) + "}}"

    # {$var.path}
    m = re.fullmatch(r"\{\s*\$\s*([A-Za-z_]\w*(?:\[[0-9]+\]|\.[A-Za-z_]\w*)*)\s*\}", s)
    if m:
        return "{{" + m.group(1) + "}}"

    # $.a.b -> {{a.b}}
    if s.startswith("$."):
        return "{{" + s[2:] + "}}"

    # $var.path -> {{var.path}}
    if s.startswith("$") and not s.startswith("$."):
        if re.fullmatch(r"\$[A-Za-z_]\w*(?:\[[0-9]+\]|\.[A-Za-z_]\w*)*", s):
            return "{{" + s[1:] + "}}"

    return s

def _resolve_args(args: Dict[str, Any], store: dict) -> Dict[str, Any]:
    out = {}
    for k, v in (args or {}).items():
        if isinstance(v, str):
            v2 = _normalize_ref(v)
            try:
                rendered = _render_value(v2, store)
            except Exception as e:
                raise UnresolvedRefError(f"Không resolve được biến cho arg '{k}': {v} ({e})")
            if isinstance(rendered, str) and ("{{" in rendered or "}}" in rendered):
                raise UnresolvedRefError(f"Không resolve được biến cho arg '{k}': {v} -> {rendered}")
            out[k] = rendered
        else:
            out[k] = v
    return out

from app.ai.executor.context_injection import inject_auth_into_args

def _args_has_target_user_id_field(tool) -> bool:
    # tool.args_model là Pydantic model
    try:
        fields = getattr(tool.args_model, "model_fields", {})  # pydantic v2
        return "target_user_id" in fields
    except Exception:
        return False

# =========================
# Execute tool
# =========================
def _execute_tool(module: str, tool: ToolSpec, args: Dict[str, Any]) -> Dict[str, Any]:
    if module != "sale_crm":
        raise ToolExecutionError(f"executor_sale_crm chỉ hỗ trợ module 'sale_crm' (nhận '{module}').")

    session = SaleCrmSessionLocal()
    try:
        parsed = tool.args_model.model_validate(args)
        return tool.handler(session=session, **parsed.model_dump())
    except Exception as e:
        raise ToolExecutionError(str(e))
    finally:
        session.close()

# =========================
# Main
# =========================
def execute_chat_sale_crm(
    module: str,
    user_id: UUID | None,
    role: str | None,
    message: str,
    compose_enabled: bool = True,
):
    # ===== Auth + Permissions =====
    auth_ctx = build_auth_context(user_id=user_id)
    if not auth_ctx.is_authenticated or not auth_ctx.role:
        raise PermissionDenied("Bạn không có quyền truy cập.")

    user_perms = set(getattr(auth_ctx, "permissions", []) or [])
    auth = auth_ctx.model_dump()

    if not check_role(module, auth_ctx):
        raise PermissionDenied(f"Role '{auth_ctx}' không được phép dùng chatbot module '{module}'.")

    # ===== helper: lấy policy tool (hỗ trợ cả 2 dạng TOOL_POLICIES) =====
    def _get_policy(mod: str, tool_name: str) -> dict | None:
        # dạng 1: TOOL_POLICIES = {"sale_crm": {"tool": {...}}}
        if isinstance(TOOL_POLICIES, dict) and mod in TOOL_POLICIES and isinstance(TOOL_POLICIES.get(mod), dict):
            return TOOL_POLICIES[mod].get(tool_name)
        # dạng 2: TOOL_POLICIES = {"tool": {...}}
        if isinstance(TOOL_POLICIES, dict):
            return TOOL_POLICIES.get(tool_name)
        return None

    def _strip_fields(obj: Any, deny_fields: set[str]) -> Any:
        if not deny_fields:
            return obj
        if isinstance(obj, dict):
            return {k: _strip_fields(v, deny_fields) for k, v in obj.items() if k not in deny_fields}
        if isinstance(obj, list):
            return [_strip_fields(x, deny_fields) for x in obj]
        return obj

    # ===== Plan =====
    plan = plan_route(module=module, message=message, auth=auth)
    audit({"event": "plan_created", "module": module, "plan": plan.model_dump()})

    if plan.needs_clarification:
        return {"answer": plan.clarifying_question, "plan": plan.model_dump()}

    validate_plan(plan, auth=auth, user_perms=user_perms)

    store: Dict[str, Any] = {}
    step_infos: list[dict] = []

    # --- run tools ---
    for idx, step in enumerate(plan.steps, start=1):
        tool = get_tool(plan.module, step.tool)
        if tool is None:
            raise ToolExecutionError(f"Không tìm thấy tool '{step.tool}' trong module '{plan.module}'.")

        try:
            resolved_args = _resolve_args(step.args, store)
        except UnresolvedRefError as e:
            audit({"event": "arg_unresolved_stop", "error": str(e), "step": step.model_dump()})
            break

        # inject_auth_into_args như code sẵn có (giữ nguyên)
        resolved_args = inject_auth_into_args(
            message=message,
            role=role,
            auth_user_id=user_id,
            tool_args=resolved_args,
            has_target_user_id_field=_args_has_target_user_id_field(tool),
        )

        # ===== ENFORCE: permission + scope + sanitize args + field masking =====
        policy = _get_policy(plan.module, step.tool)
        if not policy:
            audit({"event": "permission_denied", "module": plan.module, "tool": step.tool, "reason": "missing_policy"})
            raise PermissionDenied(f"Tool '{step.tool}' chưa khai báo policy (TOOL_POLICIES).")

        required = set(policy.get("required_permissions", []))
        if required and not required.issubset(user_perms):
            audit({"event": "permission_denied", "module": plan.module, "tool": step.tool, "reason": "missing_permissions"})
            raise PermissionDenied("Bạn không có quyền truy cập chức năng này.")

        scope = resolve_scope(role_name=auth.get("role"), module=plan.module, tool_name=step.tool)
        if scope == "NONE":
            audit({"event": "permission_denied", "module": plan.module, "tool": step.tool, "reason": "scope_NONE"})
            raise PermissionDenied("Bạn không có quyền truy cập chức năng này.")

        allowed_scopes = policy.get("allowed_scopes", ["SELF"])
        if scope not in allowed_scopes:
            scope = policy.get("default_scope", "SELF")
            if scope not in allowed_scopes:
                audit({"event": "permission_denied", "module": plan.module, "tool": step.tool, "reason": "scope_not_allowed"})
                raise PermissionDenied("Bạn không có quyền truy cập chức năng này.")

        audit({"event": "scope_resolved", "module": plan.module, "tool": step.tool, "scope": scope})

        before_args = dict(resolved_args)

        # sanitize theo scope cho sale_crm (ưu tiên target_user_id)
        if scope == "SELF":
            if "target_user_id" in resolved_args and auth.get("user_id") is not None:
                resolved_args["target_user_id"] = auth["user_id"]
            if "user_id" in resolved_args and auth.get("user_id") is not None:
                resolved_args["user_id"] = auth["user_id"]

        if before_args != resolved_args:
            audit({"event": "args_sanitized", "module": plan.module, "tool": step.tool, "before": before_args, "after": resolved_args})

        # ===== Execute tool =====
        audit({"event": "tool_call", "module": plan.module, "tool": step.tool, "args": resolved_args})
        result = _execute_tool(plan.module, tool, resolved_args)

        # field masking (deny_fields)
        deny_fields = set(((policy.get("field_policy") or {}).get("deny_fields")) or [])
        if isinstance(result, dict) and "data" in result and deny_fields:
            result = dict(result)
            result["data"] = _strip_fields(result.get("data"), deny_fields)

        audit({"event": "tool_result", "module": plan.module, "tool": step.tool, "result": result})

        step_infos.append({"id": step.id, "tool": step.tool, "args": resolved_args, "result": result})

        if isinstance(result, dict) and result.get("needs_clarification"):
            return {"answer": result.get("question"), "candidates": result.get("candidates"), "plan": plan.model_dump()}

        store[step.id] = result
        store[f"s{idx}"] = result

        if getattr(step, "save_as", None):
            if isinstance(result, dict) and "data" in result:
                store[step.save_as] = result.get("data")
                store[f"{step.save_as}__raw"] = result
            else:
                store[step.save_as] = result

    # ===== Compose answer =====
    answer = None
    if compose_enabled:
        try:
            step_infos_for_answer = _filter_step_infos_for_answer(plan.module, message, step_infos)
            step_infos_for_llm = filter_step_infos_for_llm(plan.module, step_infos_for_answer)
            composed = compose_answer_with_llm(plan.module, message, step_infos_for_llm)
            if composed:
                answer = composed
        except Exception as e:
            audit({"event": "compose_failed", "error": str(e)})

    if not answer:
        answer = "Không tìn thấy thông tin."

    return {"answer": answer, "data": store, "plan": plan.model_dump()}