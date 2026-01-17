from __future__ import annotations

import re
import json
from typing import Any, Dict, Optional, List, get_args, get_origin
from datetime import date, datetime

from app.core.rbac import check_role
from app.core.audit_log import audit
from app.core.errors import PermissionDenied, ToolExecutionError

from app.ai.answer_composer import compose_answer_with_llm, compose_safe_enough
from app.ai.router import plan_route
from app.ai.plan_validator import validate_plan
from app.ai.module_registry import get_tool
from app.ai.tooling import ToolSpec
from app.ai.executor.context_injection import inject_auth_into_args

from app.db.finance_database import FinanceSessionLocal


_DATE_YMD = re.compile(r"\b(\d{4})-(\d{2})-(\d{2})\b")
_DATE_DMY = re.compile(r"\b(\d{1,2})/(\d{1,2})/(\d{4})\b")


# =========================================================
# Minimal arg normalization (chỉ để tránh lỗi type/format)
# - Tiền có dấu phân tách: "1.200.000" -> 1200000
# - Ngày dd/mm/yyyy -> yyyy-mm-dd
# =========================================================
def _to_int_maybe(v: Any) -> Any:
    if isinstance(v, int):
        return v
    if isinstance(v, float) and v.is_integer():
        return int(v)
    if isinstance(v, str):
        s = v.strip()
        if not s:
            return v
        if re.fullmatch(r"\d{1,3}(?:[.,]\d{3})+", s) or re.fullmatch(r"\d+", s):
            digits = re.sub(r"\D", "", s)
            return int(digits) if digits else v
    return v


def _to_float_maybe(v: Any) -> Any:
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, str):
        s = v.strip()
        if not s:
            return v
        if not re.fullmatch(r"[0-9.,]+", s):
            return v

        # xử lý . và , theo vị trí xuất hiện cuối cùng
        if "." in s and "," in s:
            if s.rfind(",") > s.rfind("."):
                s = s.replace(".", "").replace(",", ".")  # 1.234,56
            else:
                s = s.replace(",", "")  # 1,234.56
        elif "," in s:
            # nếu là phân tách nghìn: 1,234,567
            if re.fullmatch(r"\d{1,3}(?:,\d{3})+", s):
                s = s.replace(",", "")
            else:
                s = s.replace(",", ".")
        elif "." in s:
            # nếu là phân tách nghìn: 1.234.567
            if re.fullmatch(r"\d{1,3}(?:\.\d{3})+", s):
                s = s.replace(".", "")
        try:
            return float(s)
        except Exception:
            return v
    return v


def _to_ymd_maybe(v: Any) -> Any:
    if not isinstance(v, str):
        return v
    s = v.strip()
    if not s:
        return v

    m = _DATE_DMY.fullmatch(s)
    if m:
        d, mo, y = m.group(1), m.group(2), m.group(3)
        return f"{y}-{int(mo):02d}-{int(d):02d}"

    # yyyymmdd -> yyyy-mm-dd
    if re.fullmatch(r"\d{8}", s):
        return f"{s[0:4]}-{s[4:6]}-{s[6:8]}"

    return v


def _strip_optional(tp: Any) -> Any:
    origin = get_origin(tp)
    if origin is None:
        return tp
    if origin is list or origin is dict:
        return tp
    if origin is getattr(__import__("typing"), "Union", None):
        args = [a for a in get_args(tp) if a is not type(None)]
        return args[0] if len(args) == 1 else tp
    return tp


def _normalize_args_for_tool(tool: ToolSpec, args: Dict[str, Any]) -> Dict[str, Any]:
    m = getattr(tool, "args_model", None)
    fields = getattr(m, "model_fields", None)
    if not fields:
        return args

    out: Dict[str, Any] = dict(args or {})
    for name, field in fields.items():
        if name not in out:
            continue
        v = out[name]
        if v is None:
            continue

        ann = _strip_optional(getattr(field, "annotation", None))

        # date-ish (string/date/datetime): normalize dd/mm/yyyy
        if ann in (str, date, datetime):
            out[name] = _to_ymd_maybe(v)
            v = out[name]

        # numeric
        if ann is int:
            out[name] = _to_int_maybe(v)
        elif ann is float:
            out[name] = _to_float_maybe(v)

    return out


def _args_has_target_user_id_field(tool) -> bool:
    m = getattr(tool, "args_model", None)
    fields = getattr(m, "model_fields", None)
    return bool(fields) and ("target_user_id" in fields)


# =========================================================
# Context-only tool suppression (tránh lan man)
# =========================================================
CONTEXT_ONLY_TOOLS_BY_MODULE: dict[str, set[str]] = {
    "finance_accounting": {"doi_tac", "tai_khoan"},
}

_BP_PROFILE_KW = re.compile(
    r"(đối tác|doi tac|khách hàng|khach hang|nhà cung cấp|nha cung cap|mst|tax|liên hệ|contact)",
    re.IGNORECASE,
)
_COA_KW = re.compile(
    r"(tài khoản|tai khoan|coa|chart of accounts|account code|account name)",
    re.IGNORECASE,
)

def _wants_partner_profile(message: str) -> bool:
    return bool(_BP_PROFILE_KW.search(message or ""))

def _wants_coa(message: str) -> bool:
    return bool(_COA_KW.search(message or ""))

def _filter_step_infos_for_compose(module: str, message: str, step_infos: list[dict]) -> list[dict]:
    suppress = CONTEXT_ONLY_TOOLS_BY_MODULE.get(module, set())
    if module != "finance_accounting":
        return step_infos

    out = []
    for si in step_infos:
        t = si.get("tool")
        if t == "doi_tac" and not _wants_partner_profile(message):
            continue
        if t == "tai_khoan" and not _wants_coa(message):
            continue
        if t in suppress:
            pass
        out.append(si)
    return out

def _filter_step_infos_for_answer(module: str, message: str, step_infos: list[dict]) -> list[dict]:
    return _filter_step_infos_for_compose(module, message, step_infos)


# =========================================================
# Placeholder resolving (giống HRM)
# =========================================================
FULL_TPL_RE = re.compile(r"^\s*\{\{\s*([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+|\[[0-9]+\])*)\s*\}\}\s*$")
VAR_DBL_RE  = re.compile(r"\{\{\s*([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+|\[[0-9]+\])*)\s*\}\}")

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

    m = re.fullmatch(r"\$\{\s*([A-Za-z_]\w*(?:\[[0-9]+\]|\.[A-Za-z_]\w*)*)\s*\}", s)
    if m:
        return "{{" + m.group(1) + "}}"

    m = re.fullmatch(r"\{\s*\$\s*([A-Za-z_]\w*(?:\[[0-9]+\]|\.[A-Za-z_]\w*)*)\s*\}", s)
    if m:
        return "{{" + m.group(1) + "}}"

    if s.startswith("$."):
        return "{{" + s[2:] + "}}"

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


# =========================================================
# Execute tool (Finance session)
# =========================================================
def _execute_tool(module: str, tool: ToolSpec, args: Dict[str, Any]) -> Dict[str, Any]:
    if module != "finance_accounting":
        raise ToolExecutionError(f"Executor finance chỉ hỗ trợ module '{module}'? (expected finance_accounting)")

    session = FinanceSessionLocal()
    try:
        parsed = tool.args_model.model_validate(args)
        return tool.handler(session=session, **parsed.model_dump())
    except Exception as e:
        raise ToolExecutionError(str(e))
    finally:
        session.close()


def _is_empty_data(x: Any) -> bool:
    if not isinstance(x, dict):
        return True
    data = x.get("data")
    if data is None:
        return True
    if isinstance(data, (list, dict)) and len(data) == 0:
        return True
    return False


# =========================================================
# MAIN
# =========================================================
def execute_chat_finance_accounting(
    module: str,
    user_id: int | None,
    role: str | None,
    message: str,
    paraphrase_enabled: bool = True,
    compose_enabled: bool = True,
):
    if not check_role(module, role):
        raise PermissionDenied(f"Role '{role}' không được phép dùng chatbot module '{module}'.")

    auth = {"user_id": user_id, "role": role, "is_authenticated": True}
    plan = plan_route(module=module, message=message, auth=auth)
    audit({"event": "plan_created", "module": module, "plan": plan.model_dump()})

    if plan.needs_clarification:
        return {"answer": plan.clarifying_question, "plan": plan.model_dump()}

    validate_plan(plan)

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

        resolved_args = inject_auth_into_args(
            auth_user_id=user_id,
            tool_args=resolved_args,
            has_target_user_id_field=_args_has_target_user_id_field(tool),
        )

        # ✅ tối thiểu: normalize args theo schema để tránh fail validate
        resolved_args = _normalize_args_for_tool(tool, resolved_args)

        audit({"event": "tool_call", "module": plan.module, "tool": step.tool, "args": resolved_args})
        result = _execute_tool(plan.module, tool, resolved_args)
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

    step_infos_for_answer = _filter_step_infos_for_answer(plan.module, message, step_infos)

    answer = None
    composed_used = False
    compose_error: str | None = None

    # có data thật không?
    has_real_data = any(
        isinstance(si.get("result"), dict)
        and si["result"].get("ok") is True
        and not _is_empty_data(si["result"])
        for si in step_infos_for_answer
    )

    # Ưu tiên compose khi có data
    if compose_enabled and has_real_data:
        try:
            composed = compose_answer_with_llm(plan.module, message, step_infos_for_answer)
            if composed and compose_safe_enough(composed):
                answer = composed
                composed_used = True
        except Exception as e:
            compose_error = str(e)
            audit({"event": "compose_failed", "error": compose_error})

    # 2) Nếu tool không có answer -> mới compose bằng LLM (và qua safety)
    if (not answer) and compose_enabled:
        try:
            composed = compose_answer_with_llm(plan.module, message, step_infos_for_answer)
            if composed and compose_safe_enough(composed):
                answer = composed
                composed_used = True
        except Exception as e:
            audit({"event": "compose_failed", "error": str(e)})

    # Nếu vẫn chưa có answer -> STRICT (không fallback format)
    if not answer:
        last = step_infos_for_answer[-1]["result"] if step_infos_for_answer else None
        if isinstance(last, dict):
            data = last.get("data")
            if data is None or data == [] or (isinstance(data, dict) and not data):
                answer = "Không có dữ liệu phù hợp."
            else:
                answer = "Không có dữ liệu phù hợp."
        else:
            answer = "Đã tra cứu xong."

    return {
        "answer": answer,
        "composed_used": composed_used,
        "compose_error": compose_error,
        "data": store,
        "plan": plan.model_dump(),
    }