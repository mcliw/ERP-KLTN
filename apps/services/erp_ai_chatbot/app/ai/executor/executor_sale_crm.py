from __future__ import annotations

import re
from typing import Any, Dict, Optional, List

from app.core.rbac import check_role
from app.core.audit_log import audit
from app.core.errors import PermissionDenied, ToolExecutionError
from app.ai.router import plan_route
from app.ai.plan_validator import validate_plan
from app.ai.module_registry import get_tool
from app.ai.tooling import ToolSpec
from app.ai.answer_composer import compose_answer_with_llm, compose_safe_enough
from app.ai.paraphraser import paraphrase_answer

from app.db.sale_crm_database import SaleCrmSessionLocal

from app.ai.executor.context_injection import inject_auth_into_args

from typing import Any, Dict

def _fmt_money(v: Any) -> str:
    try:
        n = float(v or 0)
        return f"{n:,.0f}".replace(",", ".") + " VNĐ"
    except Exception:
        return str(v)

def build_answer_sale_crm(intent: str, store: Dict[str, Any]) -> str | None:
    s1 = store.get("s1") or {}
    r1 = s1 if isinstance(s1, dict) else {}
    ok1 = r1.get("ok") is True
    d1 = r1.get("data") if isinstance(r1, dict) else None

    # 1) Hồ sơ khách hàng
    if intent in ("get_user_account_info", "ho_so_khach_hang"):
        if not ok1 or not isinstance(d1, dict):
            return (r1.get("thong_diep") or "Không có dữ liệu.")
        return (
            f"Tài khoản: {d1.get('username')} (ID {d1.get('user_id')}). "
            f"SĐT: {d1.get('phone')}. Email: {d1.get('email')}. "
            f"Role: {d1.get('role_name')}."
        )

    # 2) Trạng thái đơn + thanh toán
    if intent == "tra_cuu_trang_thai_don_hang":
        if not ok1 or not isinstance(d1, dict):
            return (r1.get("thong_diep") or "Không có dữ liệu.")
        pay = d1.get("payment") or {}
        if isinstance(pay, dict) and pay:
            return (
                f"Đơn {d1.get('order_id')}: {d1.get('order_status')}. "
                f"Thanh toán: {pay.get('payment_status')} ({pay.get('payment_method')})."
            )
        return f"Đơn {d1.get('order_id')}: {d1.get('order_status')}. Chưa có dữ liệu thanh toán."

    if intent == "trang_thai_thanh_toan_theo_don":
        if not ok1 or not isinstance(d1, dict):
            return (r1.get("thong_diep") or "Không có dữ liệu.")
        pay = d1.get("payment") or {}
        if not isinstance(pay, dict) or not pay:
            return "Đơn này chưa có dữ liệu thanh toán."
        return f"Thanh toán đơn {d1.get('order_id')}: {pay.get('payment_status')} ({pay.get('payment_method')})."

    # 3) Đơn gần nhất
    if intent == "don_hang_gan_nhat":
        if not ok1 or not isinstance(d1, dict):
            return (r1.get("thong_diep") or "Không có dữ liệu.")
        return (
            f"Đơn gần nhất: #{d1.get('order_id')} - {d1.get('order_status')}, "
            f"giá trị {_fmt_money(d1.get('total_amount'))}."
        )

    # 4) Hãng mua nhiều nhất
    if intent == "hang_mua_nhieu_nhat":
        if not ok1 or not isinstance(d1, dict):
            return (r1.get("thong_diep") or "Không có dữ liệu.")
        tb = d1.get("top_brand") or {}
        if not isinstance(tb, dict) or not tb:
            return "Không có dữ liệu."
        return (
            f"Bạn mua nhiều nhất hãng {tb.get('brand_name')}: "
            f"{tb.get('total_qty')} sản phẩm, tổng {_fmt_money(tb.get('total_amount'))}."
        )

    # 5) Voucher preview
    if intent == "ap_voucher_xem_truoc":
        if not ok1 or not isinstance(d1, dict):
            return (r1.get("thong_diep") or "Không có dữ liệu.")
        valid = d1.get("valid")
        reason = d1.get("reason")
        if valid is True:
            return "Voucher dùng được cho đơn này."
        if valid is False:
            return f"Voucher không dùng được: {reason or 'không rõ lý do'}."
        return "Không có dữ liệu."

    return None
# =========================

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
        cur = cur[key]
        if m.group(2):
            idx = int(m.group(2)[1:-1])
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
# Fallback deterministic (khi compose fail)
# =========================
def _fallback_from_result(result: Any) -> Optional[str]:
    if not isinstance(result, dict):
        return None

    data = result.get("data")
    msg = (result.get("thong_diep") or "").strip()

    if data is None:
        return msg or None

    # order status
    if isinstance(data, dict) and "order_id" in data and "order_status" in data:
        oid = data.get("order_id")
        st = data.get("order_status")
        pay = data.get("payment")
        if isinstance(pay, dict):
            pst = pay.get("payment_status")
            pm = pay.get("payment_method")
            return f"Đơn {oid}: trạng thái {st}. Thanh toán: {pst} ({pm})."
        return f"Đơn {oid}: trạng thái {st}."

    # order detail
    if isinstance(data, dict) and "items" in data and "total_amount" in data and "order_id" in data:
        oid = data.get("order_id")
        total = data.get("total_amount")
        items = data.get("items") if isinstance(data.get("items"), list) else []
        return f"Đơn {oid} có {len(items)} sản phẩm. Tổng tiền: {total}."

    # payment by order
    if isinstance(data, dict) and "payment" in data and "order_id" in data:
        p = data.get("payment")
        if not p:
            return f"Đơn {data.get('order_id')}: chưa có thông tin thanh toán."
        return f"Thanh toán đơn {data.get('order_id')}: {p.get('payment_status')} ({p.get('payment_method')})."

    # voucher preview
    if isinstance(data, dict) and {"code", "discount_amount", "payable_amount", "order_amount"}.issubset(set(data.keys())):
        return f"Mã {data.get('code')}: giảm {data.get('discount_amount')}, còn {data.get('payable_amount')}."

    if isinstance(data, list):
        if len(data) == 0:
            return msg or "Không có dữ liệu phù hợp."
        return msg or f"Có {len(data)} kết quả."

    return msg or None

# =========================
# Main
# =========================
def execute_chat_sale_crm(
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
            message=message,
            role=role,
            auth_user_id=user_id,
            tool_args=resolved_args,
            has_target_user_id_field=_args_has_target_user_id_field(tool),
        )

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

    # FILTER context-only tool outputs trước khi compose/answer
    step_infos_for_compose = _filter_step_infos_for_compose(plan.module, message, step_infos)
    step_infos_for_answer = _filter_step_infos_for_answer(plan.module, message, step_infos)

    has_real_data = any(
        (si.get("result") or {}).get("ok") is True
        and (si.get("result") or {}).get("data") not in (None, {}, [])
        for si in step_infos
    )


    # ===== Compose answer bằng LLM =====
    answer = None
    composed_used = False
    compose_error = None

    if compose_enabled:
        try:
            composed = compose_answer_with_llm(plan.module, message, step_infos_for_compose)
            if composed:
                # nếu tool có dữ liệu mà LLM nói "không có dữ liệu" -> coi như compose sai
                if has_real_data and "không có dữ liệu" in composed.lower():
                    compose_error = "LLM trả lời sai; fallback deterministic."
                    audit({"event": "compose_bad_answer", "answer": composed})
                else:
                    answer = composed
                    composed_used = True
        except Exception as e:
            compose_error = str(e)
            audit({"event": "compose_failed", "error": compose_error})


    ans = answer
    if compose_enabled and composed_used and ans and "không có dữ liệu" in ans.lower():
        # nếu tool ok và data không rỗng => fallback deterministic
        has_real_data = any(
            (si.get("result") or {}).get("ok") is True and (si.get("result") or {}).get("data") not in (None, {}, [])
            for si in step_infos
        )
        if has_real_data and plan.intent == "hang_mua_nhieu_nhat":
            tb = (store.get("s1") or {}).get("data", {}).get("top_brand")
            if tb:
                ans = f"Bạn mua nhiều nhất hãng {tb['brand_name']}: {tb['total_qty']} sản phẩm, tổng {tb['total_amount']}."
                composed_used = False
                compose_error = "LLM trả lời sai; fallback deterministic."

    # ===== Fallback deterministic nếu LLM fail / không dùng =====
    if not composed_used:

        det = build_answer_sale_crm(plan.intent, store)

        if det:
            answer = det
        else:
            # fallback mềm: dùng step_infos (KHÔNG dùng step_infos_for_answer vì có thể bị filter mất)
            parts: list[str] = []
            for si in step_infos[::-1]:
                fb = _fallback_from_result(si.get("result"))
                if fb and fb not in parts:
                    parts.append(fb)
                if len(parts) >= 2:
                    break
            answer = "\n".join(parts) if parts else "Không có dữ liệu."


    # ===== Paraphrase (chỉ khi KHÔNG dùng LLM compose) =====
    if paraphrase_enabled and (not composed_used):
        try:
            answer_final = paraphrase_answer(answer, facts={"module": plan.module}, enabled=True)
        except Exception:
            answer_final = answer
    else:
        answer_final = answer

    return {
        "answer": answer_final,
        "composed_used": composed_used,
        "compose_error": compose_error,
        "data": store,
        "plan": plan.model_dump(),
    }