# app/ai/executor/executor_cross_plan.py
from __future__ import annotations

from typing import Any, Dict, List
from uuid import UUID
import traceback
import inspect

from app.ai.plan_schema import Plan
from app.ai.placeholder import render_placeholders
from app.ai.module_registry import get_tool
from app.core.errors import PermissionDenied, InvalidPlan
from app.core.role.auth_context import AuthContext

from app.db.hrm_database import HrmSessionLocal
from app.db.finance_database import FinanceSessionLocal
from app.db.sale_crm_database import SaleCrmSessionLocal
from app.db.supply_chain_database import SupplyChainSessionLocal
from app.db.chat_database import ChatSessionLocal

from app.ai.answer_composer import compose_answer_with_llm, is_llm_available

SESSION_FACTORY = {
    "hrm": HrmSessionLocal,
    "finance_accounting": FinanceSessionLocal,
    "sale_crm": SaleCrmSessionLocal,
    "supply_chain": SupplyChainSessionLocal,
    "rag_policy": ChatSessionLocal,
}

DB_MODULES = {"hrm", "supply_chain", "sale_crm", "finance_accounting"}


def _handler_accepts_param(handler, name: str) -> bool:
    try:
        sig = inspect.signature(handler)
    except Exception:
        return False
    for p in sig.parameters.values():
        if p.kind == inspect.Parameter.VAR_KEYWORD:  # **kwargs
            return True
        if p.name == name:
            return True
    return False


def _as_error_res(code: str, message: str) -> Dict[str, Any]:
    return {"ok": False, "error": {"code": code, "message": message}}


def _extract_message_only(res: Any) -> str:
    """Fallback ngắn nếu không compose: ưu tiên thong_diep/error.message."""
    if not isinstance(res, dict):
        return ""
    if res.get("ok") and res.get("thong_diep"):
        return str(res.get("thong_diep")).strip()
    err = res.get("error") or {}
    if isinstance(err, dict) and err.get("message"):
        return str(err["message"]).strip()
    return ""


def run_cross_plan(
    plan: Plan,
    *,
    user_id: UUID | None,
    role: str | None,
    auth: AuthContext | None = None,
    debug: bool = False,
    compose_enabled: bool = True,
    question: str | None = None,  # câu hỏi gốc của user để composer trả đúng trọng tâm
) -> Dict[str, Any]:
    store: Dict[str, Any] = {}
    steps_out: List[Dict[str, Any]] = []

    for step in plan.steps:
        step_id = step.id
        module = (step.module or "").strip()
        tool_name = (step.tool or "").strip()

        args = render_placeholders(step.args or {}, store)

        # chặn DB module nếu chưa login/role
        if module in DB_MODULES and not role:
            res = _as_error_res("AUTH_REQUIRED", f"Bạn cần đăng nhập để xem thông tin chi tiết: {tool_name}.")
            store[step_id] = res
            if step.save_as:
                store[step.save_as] = res
            steps_out.append({"id": step_id, "module": module, "tool": tool_name, "args": args, "result": res})
            continue

        tool = get_tool(module, tool_name)
        if not tool:
            res = _as_error_res("TOOL_NOT_FOUND", f"Không tìm thấy tool '{tool_name}' cho module '{module}'.")
            store[step_id] = res
            if step.save_as:
                store[step.save_as] = res
            steps_out.append({"id": step_id, "module": module, "tool": tool_name, "args": args, "result": res})
            continue

        try:
            session_factory = SESSION_FACTORY.get(module)

            if session_factory:
                with session_factory() as session:
                    call_args = dict(args or {})

                    if _handler_accepts_param(tool.handler, "session"):
                        call_args["session"] = session

                    # inject user_id only if handler accepts it
                    if module == "hrm" and tool_name == "thong_tin_nhan_vien_theo_user":
                        if _handler_accepts_param(tool.handler, "user_id"):
                            call_args["user_id"] = user_id

                    res = tool.handler(**call_args)
            else:
                res = tool.handler(**(args or {}))

        except PermissionDenied:
            res = _as_error_res("PERMISSION_DENIED", "Bạn không đủ quyền để thực hiện yêu cầu này.")
        except InvalidPlan as e:
            res = _as_error_res("INVALID_PLAN", str(e) or "Yêu cầu không hợp lệ.")
        except Exception as e:
            err = {"code": "INTERNAL_ERROR", "message": "Hệ thống gặp lỗi khi xử lý yêu cầu."}
            if debug:
                err["debug_message"] = str(e)
                err["traceback"] = traceback.format_exc()
            res = {"ok": False, "error": err}

        store[step_id] = res
        if step.save_as:
            store[step.save_as] = res

        steps_out.append({"id": step_id, "module": module, "tool": tool_name, "args": args, "result": res})

    # ===== COMPOSE (LLM) =====
    answer = ""
    if compose_enabled and is_llm_available():
        # module="auto_multi" cho composer biết đây là multi-task
        answer = compose_answer_with_llm(
            module="auto_multi",
            question=(question or ""),
            step_infos=steps_out,
        ).strip()

    # fallback nếu không compose / LLM trả rỗng
    if not answer:
        msgs = []
        for si in steps_out:
            m = _extract_message_only(si.get("result"))
            if m:
                msgs.append(m)
        answer = "\n".join(msgs).strip()

    return {
        "ok": True,
        "answer": answer,
        "steps": steps_out,
        "plan": plan.model_dump(),
        "store": store,
    }
