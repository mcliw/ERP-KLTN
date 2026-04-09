# app/ai/executor/executor_chat.py
from __future__ import annotations

import json
import traceback
import os

from uuid import UUID
from typing import Any, Dict, Optional
from app.core.errors import PermissionDenied, InvalidPlan, ToolExecutionError 

from app.ai.module_detector import detect_module_llm, detect_tasks_llm
from app.ai.answer_composer import compose_answer_with_llm, compose_safe_enough, is_llm_available
from app.ai.executor.executor_hrm import execute_chat_hrm
from app.ai.executor.executor_supply_chain import execute_chat_supply_chain
from app.ai.executor.executor_sale_crm import execute_chat_sale_crm
from app.ai.executor.executor_finance_accounting import execute_chat_finance_accounting
from app.ai.executor.executor_rag_policy import execute_chat_rag_policy
from app.ai.auto_cross_planner import build_cross_plan_llm
from app.ai.executor.executor_cross_plan import run_cross_plan
from app.core.role.auth_context import build_auth_context


VALID_MODULES = {"hrm", "supply_chain", "sale_crm", "finance_accounting", "rag_policy"}
MODULE_DETECT_THRESHOLD = float(os.getenv("MODULE_DETECT_THRESHOLD", "0.60"))

def _system_error_message(q: str) -> str:
    q = (q or "").strip()
    if q:
        return f"Hệ thống gặp lỗi khi xử lý yêu cầu: {q}."
    return "Hệ thống gặp lỗi khi xử lý yêu cầu."

def _looks_like_policy(text: str) -> bool:
    t = (text or "").lower()
    keys = ["quy định", "chính sách", "hướng dẫn", "nội quy", "quy trình", "sổ tay", "policy", "handbook"]
    return any(k in t for k in keys)

def make_error_step(tool: str, message: str, code: str = "PERMISSION_DENIED", *, meta: dict | None = None, args: dict | None = None):
    return [{
        "id": "error_1",
        "tool": tool,
        "args": args or {},
        "result": {
            "ok": False,
            "error": {
                "code": code,
                "message": message,
                "meta": meta or {},
            }
        }
    }]

DB_MODULES = {"hrm", "supply_chain", "sale_crm", "finance_accounting"}

def _summarize_db_needs(db_questions: list[str]) -> str:
    # gom gọn, không lan man
    # ví dụ: "tôi đã nghỉ bao nhiêu ngày tháng này; bảng lương tháng 12"
    uniq = []
    for q in db_questions:
        q = (q or "").strip()
        if q and q not in uniq:
            uniq.append(q)
    if not uniq:
        return ""
    if len(uniq) == 1:
        return uniq[0]
    return "; ".join(uniq[:3])

def _as_float(x, default=0.0) -> float:
    try:
        return float(x)
    except Exception:
        return default

def execute_chat_unified(
    module: str,
    user_id: UUID | None,
    role: str | None,
    message: str,
    compose_enabled: bool = False,
    debug: bool = True,
) -> Dict[str, Any]:
    module = (module or "auto").strip()
    msg = (message or "").strip()
    auth_ctx = build_auth_context(user_id)

    det: Optional[Dict[str, Any]] = None
    selected_module: Optional[str] = None
    confidence: float = 0.0


    # ===== PHA A (AUTO): build cross-module plan bằng LLM =====
    if module == "auto":
        # 1) LLM tách task + build plan nhiều bước
        auth = {"user_id": str(user_id) if user_id else None, "role": role}
        plan = build_cross_plan_llm(msg, auth)

        # 2) Nếu cần làm rõ
        if plan.needs_clarification:
            q = plan.clarifying_question or "Bạn muốn hỏi về nghiệp vụ ERP hay tra cứu chính sách?"
            out = {
                "answer": q,
                "selected_module": None,
                "confidence": 0.0,
                "needs_clarification": True,
                "clarifying_question": q,
                "plan": plan.model_dump(),
            }
            if debug:
                out["plan_debug"] = plan.model_dump()
            return out

        # 3) Nếu có steps => chạy cross-module executor
        if plan.steps:
            res = run_cross_plan(
                plan,
                user_id=user_id,
                role=auth_ctx.role,
                auth=auth_ctx,
                debug=debug,
            )

            final_answer = res.get("answer") or ""

            # ✅ AUTO COMPOSE: ném tool results vào LLM để viết câu trả lời cuối
            if compose_enabled:
                step_infos = res.get("steps") or []
                try:
                    if is_llm_available():
                        final_answer = compose_answer_with_llm(
                            module="auto_multi",
                            question=msg,
                            step_infos=step_infos,
                        )
                    else:
                        # không có LLM -> fallback gọn
                        from app.ai.answer_composer import compose_fallback_from_steps
                        final_answer = compose_fallback_from_steps(msg, step_infos)

                    # ✅ validate: không cho bịa số/ngày/mã ngoài payload
                    payload_text = json.dumps(
                        {"question": msg, "tool_results": step_infos},
                        ensure_ascii=False,
                        separators=(",", ":"),
                        default=str,
                    )

                    # bạn đã đổi tên compose_safe_enough -> is_safe_enough ở answer_composer.py
                    from app.ai.answer_composer import is_safe_enough, compose_fallback_from_steps

                    if not is_safe_enough(final_answer, payload_text=payload_text):
                        final_answer = compose_fallback_from_steps(msg, step_infos)

                except Exception:
                    # fallback cuối
                    from app.ai.answer_composer import compose_fallback_from_steps
                    final_answer = compose_fallback_from_steps(msg, step_infos)

            out = {
                "answer": final_answer,
                "selected_module": "auto_multi",
                "confidence": 1.0,
                "plan": plan.model_dump(),
            }

            if debug:
                out["steps"] = res.get("steps")
                out["store"] = res.get("store")

            return out


        # 4) Fallback: không build được plan thì quay về detect module đơn
        det = detect_module_llm(message=msg, role=role)
        selected_module = det.get("selected_module")
        confidence = _as_float(det.get("confidence"), 0.0)

        # ===== SINGLE TASK: fallback flow cũ (detect_module_llm) =====
        # nếu tasks chỉ có 1 -> dùng detector cũ để giữ behavior hiện tại
        needs_clar = bool(det.get("needs_clarification"))
        if (not selected_module) or needs_clar or (confidence < MODULE_DETECT_THRESHOLD):
            q = det.get("clarifying_question") or "Bạn muốn hỏi thuộc module nào: hrm / supply_chain / sale_crm / finance_accounting?"
            out = {
                "answer": q,
                "selected_module": selected_module,
                "confidence": confidence,
                "needs_clarification": True,
                "clarifying_question": q,
                "plan": {
                    "module": selected_module or "auto",
                    "intent": "chon_module",
                    "needs_clarification": True,
                    "clarifying_question": q,
                    "steps": [],
                    "final_response_template": None,
                },
            }
            if debug:
                out["detector"] = det
            return out

        module = selected_module
    else:
        selected_module = module
        confidence = 1.0

    if selected_module not in VALID_MODULES:
        q = "Module không hợp lệ. Chọn: hrm / supply_chain / sale_crm / finance_accounting."
        out = {
            "answer": q,
            "selected_module": None,
            "confidence": 0.0,
            "needs_clarification": True,
            "clarifying_question": q,
            "plan": {
                "module": "auto",
                "intent": "module_khong_hop_le",
                "needs_clarification": True,
                "clarifying_question": q,
                "steps": [],
                "final_response_template": None,
            },
        }
        if debug and det:
            out["detector"] = det
        return out
    
    # ===== PHA B/C Delegate + BẮT LỖI =====
    try:
        if selected_module == "hrm":
            res = execute_chat_hrm(
                module="hrm",
                user_id=user_id,
                role=role,
                message=msg,
                compose_enabled=compose_enabled,
            )
        elif selected_module == "supply_chain":
            res = execute_chat_supply_chain(
                module="supply_chain",
                user_id=user_id,
                role=role,
                message=msg,
                compose_enabled=compose_enabled,
            )
        elif selected_module == "sale_crm":
            res = execute_chat_sale_crm(
                module="sale_crm",
                user_id=user_id,
                role=role,
                message=msg,
                compose_enabled=compose_enabled,
            )
        elif selected_module == "rag_policy":
            res = execute_chat_rag_policy(
                module="rag_policy",
                user_id=user_id,
                role=role,
                session_id=None,
                message=msg,
                compose_enabled=compose_enabled,
                top_k=5,
            )
        else:
            res = execute_chat_finance_accounting(
                module="finance_accounting",
                user_id=user_id,
                role=role,
                message=msg,
                compose_enabled=compose_enabled,
            )

    except (PermissionDenied, InvalidPlan) as e:
        msg_err = str(e)
        step_infos = make_error_step(
            "__permission_check__",
            msg_err,
            code="PERMISSION_DENIED",
            meta={"module": selected_module or module, "reason": "rbac_or_scope", "question": msg}
        )
        out = {"ok": False, "module": selected_module or module, "answer": msg_err, "steps": step_infos}
        if debug:
            out["debug_error"] = {"type": type(e).__name__, "message": msg_err}
        return out

    except Exception as e:
        tb = traceback.format_exc()

        step_infos = make_error_step("__system__", "Hệ thống gặp lỗi khi xử lý yêu cầu.", code="INTERNAL_ERROR")
        out = {"ok": False,
            "module": selected_module or module,
            "answer": "Hệ thống gặp lỗi khi xử lý yêu cầu.",
            "steps": step_infos
        }

        # ✅ chỉ bật khi debug=true để không lộ nội bộ
        if debug:
            out["debug_error"] = {
                "type": type(e).__name__,
                "message": str(e),
                "traceback": tb,
            }
        return out

    res = dict(res or {})
    res.setdefault("plan", {})
    res["selected_module"] = selected_module
    res["confidence"] = confidence

    if debug:
        if det:
            res["detector"] = det
        return res

    out = {
        "answer": res.get("answer"),
        "selected_module": selected_module,
        "confidence": confidence,
        "plan": res.get("plan"),
    }
    if "candidates" in res:
        out["candidates"] = res["candidates"]
    return out