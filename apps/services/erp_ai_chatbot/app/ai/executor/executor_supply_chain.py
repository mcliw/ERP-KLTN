from __future__ import annotations
import re
import json
import os

from uuid import UUID
from typing import Any, Dict, Optional, List
from datetime import datetime
from app.core.audit_log import audit
from app.core.errors import PermissionDenied, ToolExecutionError
from app.ai.router import plan_route
from app.ai.plan_validator import validate_plan
from app.ai.module_registry import get_tool
from app.ai.tooling import ToolSpec
from app.ai.answer_composer import compose_answer_with_llm, compose_safe_enough
from app.ai.llm_payload_filter import filter_step_infos_for_llm

from app.db.supply_chain_database import SupplyChainSessionLocal

from app.core.role.auth_context import build_auth_context
from app.core.role.rbac import check_role
from app.core.role.tool_policies import TOOL_POLICIES
from app.core.role.scope_resolver import resolve_scope
from app.core.role.enforcer import (
    check_required_permissions,
    sanitize_args_by_scope,
    apply_field_policy,
)

def _s(v, default="N/A"):
    if v is None: return default
    if isinstance(v, str) and not v.strip(): return default
    return v

def _clip_data(data: Any, list_n: int = 12, nested_n: int = 12) -> Any:
    # primitive
    if data is None or isinstance(data, (str, int, float, bool)):
        return data

    # list
    if isinstance(data, list):
        return [_clip_data(x, list_n=list_n, nested_n=nested_n) for x in data[:list_n]]

    # dict
    if isinstance(data, dict):
        out = {}
        for k, v in data.items():
            if isinstance(v, list):
                out[k] = [_clip_data(x, list_n=list_n, nested_n=nested_n) for x in v[:nested_n]]
            elif isinstance(v, dict):
                out[k] = _clip_data(v, list_n=list_n, nested_n=nested_n)
            else:
                out[k] = v
        return out

    # fallback
    return str(data)

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


FULL_TPL_RE = re.compile(r"^\s*\{\{\s*([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+|\[[0-9]+\])*)\s*\}\}\s*$")
VAR_DBL_RE = re.compile(r"\{\{\s*([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+|\[[0-9]+\])*)\s*\}\}")

def _render_value(tpl: str, store: dict):
    tpl = tpl or ""

    # full placeholder => trả đúng type
    m = FULL_TPL_RE.match(tpl)
    if m:
        path = m.group(1)
        try:
            return _get_path(store, path)
        except Exception:
            # fallback: s1.xxx -> s1.data.xxx (nếu store s1 là wrapper có data)
            m2 = re.match(r"^(s[0-9]+)\.(.+)$", path)
            if m2:
                step_id = m2.group(1)
                rest = m2.group(2)
                return _get_path(store, f"{step_id}.data.{rest}")
            raise

    # partial replace => string
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

    # NEW: hỗ trợ ${var.path}
    m = re.fullmatch(r"\$\{\s*([A-Za-z_]\w*(?:\[[0-9]+\]|\.[A-Za-z_]\w*)*)\s*\}", s)
    if m:
        return "{{" + m.group(1) + "}}"

    # NEW: hỗ trợ {$var.path}
    m = re.fullmatch(r"\{\s*\$\s*([A-Za-z_]\w*(?:\[[0-9]+\]|\.[A-Za-z_]\w*)*)\s*\}", s)
    if m:
        return "{{" + m.group(1) + "}}"

    # 1) JSONPath dạng $.a.b -> {{a.b}}
    if s.startswith("$."):
        return "{{" + s[2:] + "}}"

    # 2) Biến dạng $nv_info.id hoặc $partial_pos[0].po_code -> {{nv_info.id}} / {{partial_pos[0].po_code}}
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
            # nếu vẫn còn {{ }} => unresolved
            if isinstance(rendered, str) and ("{{" in rendered or "}}" in rendered):
                raise UnresolvedRefError(f"Không resolve được biến cho arg '{k}': {v} -> {rendered}")
            out[k] = rendered
        else:
            out[k] = v
    return out

def _execute_tool(module: str, tool: ToolSpec, args: Dict[str, Any]) -> Dict[str, Any]:
    if module == "supply_chain":
        session = SupplyChainSessionLocal()
        try:
            parsed = tool.args_model.model_validate(args)
            return tool.handler(session=session, **parsed.model_dump())
        except Exception as e:
            raise ToolExecutionError(str(e))
        finally:
            session.close()
    raise ToolExecutionError(f"Chưa hỗ trợ executor cho module '{module}'.")

# =========================
# Main
# =========================
def execute_chat_supply_chain(
    module: str,
    user_id: UUID | None,
    role: str | None,
    message: str,
    compose_enabled: bool = True,
):
    # ===== (1) Build auth context từ Identity + RBAC =====
    auth_ctx = build_auth_context(user_id=user_id)
    if not auth_ctx.is_authenticated or not auth_ctx.role:
        raise PermissionDenied("Bạn không có quyền truy cập.")

    user_perms = set(getattr(auth_ctx, "permissions", []) or [])
    auth = auth_ctx.model_dump()

    # ===== (2) Gate theo module (scope + permission tối thiểu nếu bạn có trong check_role) =====
    if not check_role(module, auth_ctx):
        raise PermissionDenied(f"Role '{auth_ctx.role}' không được phép dùng chatbot module '{module}'.")

    # ===== (3) Lập plan =====
    plan = plan_route(module=module, message=message, auth=auth)
    audit({"event": "plan_created", "module": module, "plan": plan.model_dump()})

    if plan.needs_clarification:
        return {"answer": plan.clarifying_question, "plan": plan.model_dump()}

    # ===== (4) Validate plan (permission + scope + args vượt scope) =====
    validate_plan(plan, auth=auth, user_perms=user_perms)

    store: Dict[str, Any] = {}
    step_infos: list[dict] = []

    # ===== (5) Execute tools =====
    for idx, step in enumerate(plan.steps, start=1):
        tool = get_tool(plan.module, step.tool)
        if tool is None:
            raise ToolExecutionError(f"Không tìm thấy tool '{step.tool}' trong module '{plan.module}'.")

        # --- resolve placeholders ---
        try:
            resolved_args = _resolve_args(step.args, store)
        except UnresolvedRefError as e:
            audit({"event": "arg_unresolved_stop", "error": str(e), "step": step.model_dump()})
            break

        # --- enforce permission + scope (executor layer) ---
        policy = TOOL_POLICIES.get(step.tool, {})  # nếu tool chưa khai policy thì PlanValidator đã chặn
        required = set(policy.get("required_permissions", []) or [])
        if required and not required.issubset(user_perms):
            audit({
                "event": "permission_denied",
                "module": plan.module,
                "tool": step.tool,
                "reason": "missing_permissions",
                "required": sorted(list(required)),
            })
            raise PermissionDenied("Bạn không có quyền truy cập chức năng này.")

        scope = resolve_scope(role_name=auth_ctx.role, module=plan.module, tool_name=step.tool)
        audit({"event": "scope_resolved", "module": plan.module, "tool": step.tool, "scope": scope})

        if scope == "NONE":
            audit({"event": "permission_denied", "module": plan.module, "tool": step.tool, "reason": "scope_none"})
            raise PermissionDenied("Bạn không có quyền truy cập chức năng này.")

        allowed_scopes = set(policy.get("allowed_scopes", []) or [])
        if allowed_scopes and scope not in allowed_scopes:
            audit({
                "event": "permission_denied",
                "module": plan.module,
                "tool": step.tool,
                "reason": "scope_not_allowed",
                "scope": scope,
                "allowed_scopes": sorted(list(allowed_scopes)),
            })
            raise PermissionDenied("Bạn không có quyền truy cập chức năng này.")

        # --- sanitize/inject args theo scope (không phá logic sẵn có; chỉ override nếu có field) ---
        sanitized_args = dict(resolved_args)

        # SELF: nếu tool lỡ có các field kiểu user_id/target_user_id thì ép về chính mình
        if scope == "SELF":
            if "user_id" in sanitized_args and auth_ctx.user_id is not None:
                sanitized_args["user_id"] = auth_ctx.user_id
            if "target_user_id" in sanitized_args and auth_ctx.user_id is not None:
                sanitized_args["target_user_id"] = auth_ctx.user_id

        # DEPT: nếu auth có dept và tool có field dept tương ứng thì inject
        if scope == "DEPT":
            dept_id = auth.get("department_id") or auth.get("dept_id")
            dept_code = auth.get("department_code") or auth.get("dept_code")

            if dept_id is not None:
                if "department_id" in sanitized_args:
                    sanitized_args["department_id"] = dept_id
                if "dept_id" in sanitized_args:
                    sanitized_args["dept_id"] = dept_id

            if dept_code:
                if "department_code" in sanitized_args:
                    sanitized_args["department_code"] = dept_code
                if "dept_code" in sanitized_args:
                    sanitized_args["dept_code"] = dept_code

        if sanitized_args != resolved_args:
            audit({
                "event": "args_sanitized",
                "module": plan.module,
                "tool": step.tool,
                "before": resolved_args,
                "after": sanitized_args,
                "scope": scope,
            })

        # --- run tool ---
        audit({"event": "tool_call", "module": plan.module, "tool": step.tool, "args": sanitized_args})
        result = _execute_tool(plan.module, tool, sanitized_args)
        audit({"event": "tool_result", "module": plan.module, "tool": step.tool, "result": result})

        step_infos.append({"id": step.id, "tool": step.tool, "args": sanitized_args, "result": result})

        if isinstance(result, dict) and result.get("needs_clarification"):
            return {
                "answer": result.get("question"),
                "candidates": result.get("candidates"),
                "plan": plan.model_dump()
            }

        store[step.id] = result
        store[f"s{idx}"] = result

        if getattr(step, "save_as", None):
            if isinstance(result, dict) and "data" in result:
                store[step.save_as] = result.get("data")
                store[f"{step.save_as}__raw"] = result
            else:
                store[step.save_as] = result

    # ===== Compose answer bằng LLM =====
    answer = None
    composed_used = False

    if compose_enabled:
        try:
            step_infos_for_llm = filter_step_infos_for_llm(plan.module, step_infos)
            composed = compose_answer_with_llm(plan.module, message, step_infos_for_llm)
            if composed:
                answer = composed
                composed_used = True
        except Exception as e:
            audit({"event": "compose_failed", "error": str(e)})

    return {"answer": answer, "data": store, "plan": plan.model_dump()}