from __future__ import annotations

import re
import json
import os

from uuid import UUID
from typing import Any, Dict, Optional, List
from datetime import datetime
from zoneinfo import ZoneInfo
from app.ai.router import plan_route
from app.ai.plan_validator import validate_plan
from app.ai.module_registry import get_tool
from app.ai.tooling import ToolSpec
from app.ai.answer_composer import compose_answer_with_llm, compose_safe_enough
from app.ai.executor.context_injection import inject_auth_into_args
from app.ai.llm_payload_filter import filter_step_infos_for_llm
from app.db.hrm_database import HrmSessionLocal

from app.core.audit_log import audit
from app.core.errors import PermissionDenied, ToolExecutionError, InvalidPlan 

from app.core.role.rbac import check_role
from app.core.role.auth_context import build_auth_context
from app.core.role.tool_policies import TOOL_POLICIES
from app.core.role.scope_resolver import resolve_scope
from app.core.role.enforcer import (
    check_required_permissions,
    sanitize_args_by_scope,
    apply_field_policy,
)
from uuid import UUID
from typing import Any

def _looks_like_uuid(v: Any) -> bool:
    if isinstance(v, UUID):
        return True
    if isinstance(v, str) and "-" in v:
        try:
            UUID(v)
            return True
        except Exception:
            return False
    return False

def _fix_args_before_validate(args: dict, tool, auth_ctx) -> dict:
    out = dict(args or {})
    fields = getattr(tool.args_model, "model_fields", {}) or {}

    # Nếu tool dùng employee_code thì ưu tiên employee_code, bỏ employee_id nếu bị UUID
    if "employee_code" in fields:
        # nếu plan lỡ đưa employee_id=UUID => drop
        if _looks_like_uuid(out.get("employee_id")):
            out.pop("employee_id", None)
        return out

    # Nếu tool dùng user_id thì chỉ set user_id
    if "user_id" in fields:
        # đảm bảo user_id là UUID đúng
        if "user_id" not in out or out["user_id"] is None:
            out["user_id"] = auth_ctx.user_id
        return out

    # Chỉ khi tool thật sự có employee_id thì mới inject employee_id
    if "employee_id" in fields:
        v = out.get("employee_id")
        if v is None or _looks_like_uuid(v):
            if auth_ctx.employee_id is None:
                raise ToolExecutionError("Không xác định được employee_id của user hiện tại.")
            out["employee_id"] = auth_ctx.employee_id

    return out

def _args_has_target_user_id_field(tool) -> bool:
    # tool.args_model là Pydantic model class
    m = getattr(tool, "args_model", None)
    fields = getattr(m, "model_fields", None)
    return bool(fields) and ("target_user_id" in fields)

# Fix để câu trả lời chỉ bám câu hỏi (không lôi thông tin NV)
# Tool chỉ để lấy context (không nên đưa vào câu trả lời cuối)
CONTEXT_ONLY_TOOLS_BY_MODULE: dict[str, set[str]] = {
    "hrm": {"tim_nhan_vien", "thong_tin_nhan_vien"},
}

_EMP_PROFILE_KW = re.compile(
    r"(thông tin|hồ sơ|profile|liên hệ|sđt|điện thoại|email|phòng ban|thuộc phòng|phòng nào|department"
    r"|chức vụ|ngày vào|ngày nghỉ|trạng thái|status|active|inactive)",
    re.IGNORECASE
)


def _wants_employee_profile(message: str) -> bool:
    return bool(_EMP_PROFILE_KW.search(message or ""))

def _filter_step_infos_for_compose(module: str, message: str, step_infos: list[dict]) -> list[dict]:
    suppress = CONTEXT_ONLY_TOOLS_BY_MODULE.get(module, set())
    if module == "hrm" and not _wants_employee_profile(message):
        # bỏ các tool chỉ để lấy context nhân viên khỏi payload gửi LLM
        return [si for si in step_infos if si.get("tool") not in suppress]
    return step_infos


def _extract_requested_metrics(message: str) -> list[str]:
    m = (message or "").lower()
    metrics: list[str] = []

    # chấm công/tháng
    if "đi muộn" in m or "di muon" in m or "late" in m:
        metrics.append("late_minutes")
    if "về sớm" in m or "ve som" in m or "early" in m:
        metrics.append("early_leave_minutes")
    if "ot" in m or "làm thêm" in m or "lam them" in m:
        metrics.append("ot_hours")
    if "đi làm" in m or "di lam" in m or "present" in m or "công" in m:
        metrics.append("present_days")
    if "vắng" in m or "vang" in m or "absent" in m:
        metrics.append("absent_days")
    if "nghỉ" in m or "nghi" in m or "leave" in m:
        metrics.append("leave_days")

    # nghỉ phép
    if "đơn nghỉ" in m or "nghỉ phép" in m or "don nghi" in m:
        # list fields (không phải metrics)
        metrics.append("leave_list_compact")

    return metrics

_EMP_CODE_RE = re.compile(r"^[A-Za-z]{1,10}\d{1,10}$")  # ví dụ NV001

def _is_int_like(s: str) -> bool:
    s = (s or "").strip()
    return s.isdigit()

def _auto_resolve_hrm_employee_id(args: Dict[str, Any], auth_ctx) -> Dict[str, Any]:
    """
    Nếu args.employee_id đang là mã NV (VD: 'NV001') thay vì int,
    thì tự gọi tool 'thong_tin_nhan_vien' (fallback 'tim_nhan_vien') để lấy employee_id int.
    Chỉ chạy khi employee_id là string không phải số.
    """
    if "employee_id" not in args:
        return args

    v = args.get("employee_id")
    if not isinstance(v, str):
        return args

    raw = v.strip()
    if not raw or _is_int_like(raw):
        return args

    # chỉ xử lý nếu giống mã NV/EMP code
    if not _EMP_CODE_RE.fullmatch(raw):
        return args

    # gọi tool lookup nhân viên để lấy employee_id
    tool = get_tool("hrm", "thong_tin_nhan_vien") or get_tool("hrm", "tim_nhan_vien")
    if not tool:
        return args

    lookup_args = {"employee_code": raw} if tool.name == "thong_tin_nhan_vien" else {"tu_khoa": raw}
    lookup_res = _execute_tool("hrm", tool, lookup_args, auth_ctx)

    data = (lookup_res or {}).get("data") if isinstance(lookup_res, dict) else None
    emp_id = data.get("employee_id") if isinstance(data, dict) else None

    if isinstance(emp_id, int) and emp_id > 0:
        args = dict(args)
        args["employee_id"] = emp_id

    return args

_NUM_RE = re.compile(r"\d+")
_CODE_RE = re.compile(r"\b[A-Z]{2,}-\d+\b")  # PO-20250001, GR-..., PR-...

def _extract_numbers(text: str) -> set[str]:
    return set(_NUM_RE.findall(text or ""))

def _extract_codes(text: str) -> set[str]:
    return set(_CODE_RE.findall(text or ""))

def _compose_safe_enough(answer: str, payload_text: str) -> bool:
    if not answer:
        return False
    if len(answer) > 800:
        return False
    if "..." in answer:
        return False
    if "{{" in answer or "}}" in answer:
        return False

    # không sinh số/mã mới ngoài payload
    an = _extract_numbers(answer)
    pn = _extract_numbers(payload_text)
    if not an.issubset(pn):
        return False

    ac = _extract_codes(answer)
    pc = _extract_codes(payload_text)
    if not ac.issubset(pc):
        return False

    return True

VAR_SGL_RE = re.compile(r"\{\s*(s[0-9]+(?:\.[a-zA-Z0-9_]+|\[[0-9]+\])*)\s*\}")
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

def _execute_tool(module: str, tool: ToolSpec, args: Dict[str, Any], auth_ctx) -> Dict[str, Any]:
    if module == "hrm":
        session = HrmSessionLocal()
        try:
            args = _fix_args_before_validate(args, tool, auth_ctx)
            parsed = tool.args_model.model_validate(args)
            return tool.handler(session=session, **parsed.model_dump())
        except Exception as e:
            raise ToolExecutionError(str(e))
        finally:
            session.close()

    raise ToolExecutionError(f"Chưa hỗ trợ executor cho module '{module}'.")

def _s(v, default="N/A"):
    if v is None: return default
    if isinstance(v, str) and not v.strip(): return default
    return v

def _fmt_date_vi(iso: Any) -> str:
    if not iso:
        return "N/A"
    if isinstance(iso, str):
        s = iso.strip()
        if not s:
            return "N/A"
        try:
            dt = datetime.fromisoformat(s.replace("Z", ""))
            return dt.strftime("%d/%m/%Y")
        except Exception:
            # fallback: lấy phần YYYY-MM-DD
            return s.split("T")[0]
    return str(iso)

def _fmt_list(lines: List[str], limit: int = 7) -> str:
    if not lines: return ""
    shown = lines[:limit]
    more = len(lines) - len(shown)
    return "\n".join(shown) + (f"\n(+{more} dòng)" if more > 0 else "")

def _fmt_money(v: Any) -> str:
    if v is None:
        return "N/A"
    try:
        if isinstance(v, str):
            s = v.strip()
            if not s:
                return "N/A"
            v = float(s.replace(",", ""))
        return f"{float(v):,.0f}"
    except Exception:
        return str(v)

def _drop_none(d: Dict[str, Any]) -> Dict[str, Any]:
    return {k: v for k, v in d.items() if v is not None}

def _is_bad_answer(answer: str) -> bool:
    if not answer: return True
    if "..." in answer: return True
    if "{{" in answer or "}}" in answer: return True
    if "{s" in answer: return True
    return False

# Các field nhạy cảm HRM: mặc định không đưa vào payload preview/LLM
_HRM_SENSITIVE_KEYS = {
    "phone", "phone_number",
    "email", "email_company", "email_personal",
    "address", "home_address",
    "identity_no", "id_no", "cccd", "passport",
}

def _drop_none(d: Dict[str, Any]) -> Dict[str, Any]:
    return {k: v for k, v in d.items() if v is not None}

def _strip_sensitive(d: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(d, dict):
        return d
    return {k: v for k, v in d.items() if k not in _HRM_SENSITIVE_KEYS}

def _sanitize_args_for_scope(step_tool: str, args: dict, auth: dict) -> dict:
    a = dict(args or {})
    uid = auth.get("user_id")
    eid = auth.get("employee_id")

    # Tool self: luôn ép user_id đúng người đang đăng nhập
    if step_tool == "thong_tin_nhan_vien_theo_user":
        if uid is not None:
            a["user_id"] = uid
        return a

    # Nếu scope SELF (bạn lấy scope ở validate_plan rồi), thì chặn chỉ định người khác
    # (cái này validator đã làm, nhưng sanitize để chắc)
    # Ví dụ: tool theo id
    if step_tool == "thong_tin_nhan_vien_id" and eid is not None:
        a["employee_id"] = int(eid)

    # tool theo mã: trong SELF thì không cho
    # tool theo mã: chỉ pop trong SELF
    if step_tool == "thong_tin_nhan_vien" and auth.get("scope") == "SELF":
        a.pop("employee_code", None)

    return a

# =========================
# Main
# =========================
def execute_chat_hrm(
    module: str,
    user_id: UUID | None,
    role: str | None,
    message: str,
    compose_enabled: bool = True,
):
    auth_ctx = build_auth_context(user_id=user_id)
    if not auth_ctx.is_authenticated or not auth_ctx.role:
        audit({"event": "permission_denied", "module": module, "reason": "not_authenticated"})
        raise PermissionDenied("Bạn không có quyền truy cập.")

    user_perms = set(auth_ctx.permissions)
    effective_role = auth_ctx.role
    # gate theo module (scope matrix + min perms nếu bạn có)
    if not check_role(module, auth_ctx):
        audit({"event": "permission_denied", "module": module, "reason": "not_authenticated"})
        raise PermissionDenied(f"Role '{effective_role }' không được phép dùng chatbot module '{module}'.")

    # auth dùng cho executor/sanitize (nội bộ)
    auth = {
        "user_id": user_id,
        "role": effective_role,
        "is_authenticated": True,
        "employee_id": None,
        "department_code": None,
    }

    # ===== bootstrap employee_id của user (để enforce SELF) =====
    # (không sửa tool; nếu tool không có thì bỏ qua)
    try:
        boot_tool = get_tool("hrm", "thong_tin_nhan_vien_theo_user")
        if boot_tool is not None and user_id is not None:
            boot_res = _execute_tool("hrm", boot_tool, {"user_id": user_id}, auth_ctx)
            if isinstance(boot_res, dict) and boot_res.get("ok") and isinstance(boot_res.get("data"), dict):
                auth["employee_id"] = boot_res["data"].get("employee_id")
                auth["department_code"] = boot_res["data"].get("department_code")
    except Exception:
        pass

    # auth dùng cho planner/LLM (tránh set trong JSON)
    auth_for_planner = {
        "user_id": user_id,
        "role": auth_ctx.role,
        "is_authenticated": True,
        "permissions": sorted(list(user_perms)),
        "employee_id": auth.get("employee_id"),
        "department_code": auth.get("department_code"),
    }

    # ===== helper: lấy policy tool (hỗ trợ cả 2 dạng TOOL_POLICIES) =====
    def _get_policy(mod: str, tool_name: str) -> dict | None:
        # dạng 1: TOOL_POLICIES = {"hrm": {"tool": {...}}}
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
    plan = plan_route(module=module, message=message, auth=auth_for_planner)
    audit({"event": "plan_created", "module": module, "plan": plan.model_dump()})

    if not plan.steps and plan.final_response_template:
        return {
            "answer": plan.final_response_template,
            "data": {},
            "plan": plan.model_dump(),
        }

    if plan.needs_clarification:
        return {"answer": plan.clarifying_question, "plan": plan.model_dump()}

    # validate_plan mới (có permission + scope + vượt SELF)
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

            def _now_bkk():
                return datetime.now(ZoneInfo("Asia/Bangkok"))

            text = (message or "").lower()

            if step.tool in {"ngay_thieu_checkout", "tong_hop_cham_cong_thang"}:
                if re.search(r"\btháng này\b", text):
                    now = _now_bkk()
                    resolved_args["month"] = now.month
                    resolved_args["year"] = now.year

            if plan.module == "hrm":
                resolved_args = _auto_resolve_hrm_employee_id(resolved_args, auth_ctx)

        except UnresolvedRefError as e:
            audit({"event": "arg_unresolved_stop", "error": str(e), "step": step.model_dump()})
            break

        auth_user_id = user_id if user_id is not None else None

        # inject auth như code cũ (giữ nguyên)
        resolved_args = inject_auth_into_args(
            message=message,
            role= auth_ctx.role,
            auth_user_id=auth_user_id,
            tool_args=resolved_args,
            has_target_user_id_field=_args_has_target_user_id_field(tool),
        )

        # ưu tiên ép args cho tool self theo auth (chống LLM truyền sai)
        resolved_args = _sanitize_args_for_scope(step.tool, resolved_args, auth)


        # ===== ENFORCE: permission + scope + sanitize args + field masking =====
        policy = _get_policy(plan.module, step.tool)
        if not policy:
            audit({"event": "permission_denied", "module": plan.module, "tool": step.tool, "reason": "missing_policy"})
            raise PermissionDenied(f"Tool '{step.tool}' chưa khai báo policy (TOOL_POLICIES).")

        required = set(policy.get("required_permissions", []))
        if required and not required.issubset(user_perms):
            audit({"event": "permission_denied", "module": plan.module, "tool": step.tool, "reason": "missing_permissions"})
            raise PermissionDenied("Bạn không có quyền truy cập chức năng này.")

        scope = resolve_scope(role_name=auth_ctx.role, module=plan.module, tool_name=step.tool) 
        if scope == "NONE":
            audit({"event": "permission_denied", "module": plan.module, "tool": step.tool, "reason": "scope_NONE"})
            raise PermissionDenied("Bạn không có quyền truy cập chức năng này.")

        allowed_scopes = policy.get("allowed_scopes", ["SELF"])
        if scope not in allowed_scopes:
            scope = policy.get("default_scope", "SELF")
            if scope not in allowed_scopes:
                audit({"event": "permission_denied", "module": plan.module, "tool": step.tool, "reason": "scope_not_allowed"})
                raise PermissionDenied("Bạn không có quyền truy cập chức năng này.")

        before_args = dict(resolved_args)
        
        # nếu SELF mà chưa bootstrap được employee_id thì nên chặn (không enforce được)
        if scope == "SELF" and auth.get("employee_id") is None and (
            "employee_id" in resolved_args or "approver_id" in resolved_args
        ):
            raise PermissionDenied("Không xác định được employee_id để enforce phạm vi SELF.")
        
        resolved_args = sanitize_args_by_scope(resolved_args, scope, auth)

        audit({"event": "scope_resolved", "module": plan.module, "tool": step.tool, "scope": scope})
        if before_args != resolved_args:
            audit({"event": "args_sanitized", "module": plan.module, "tool": step.tool, "before": before_args, "after": resolved_args})

        # ===== Execute tool =====
        audit({"event": "tool_call", "module": plan.module, "tool": step.tool, "args": resolved_args})
        result = _execute_tool(plan.module, tool, resolved_args, auth_ctx)

        # field policy: allow/mask theo scope
        scope_field_policy = (policy.get("field_policy") or {}).get(scope) or {}
        result = apply_field_policy(result, scope_field_policy)

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

    if not answer:
        answer = "Không tìm thấy thông tin."

    return {"answer": answer, "data": store, "plan": plan.model_dump()}
