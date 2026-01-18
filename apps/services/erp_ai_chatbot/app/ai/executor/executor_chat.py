# app/ai/executor/executor_chat.py
from __future__ import annotations

import json
import traceback
import os

from uuid import UUID
from typing import Any, Dict, Optional
from app.core.errors import PermissionDenied, InvalidPlan, ToolExecutionError 

from app.ai.module_detector import detect_module_llm
from app.ai.answer_composer import compose_answer_with_llm, compose_safe_enough, is_llm_available
from app.ai.executor.executor_hrm import execute_chat_hrm
from app.ai.executor.executor_supply_chain import execute_chat_supply_chain
from app.ai.executor.executor_sale_crm import execute_chat_sale_crm
from app.ai.executor.executor_finance_accounting import execute_chat_finance_accounting
from app.ai.executor.executor_rag_policy import execute_chat_rag_policy

VALID_MODULES = {"hrm", "supply_chain", "sale_crm", "finance_accounting", "rag_policy"}
MODULE_DETECT_THRESHOLD = float(os.getenv("MODULE_DETECT_THRESHOLD", "0.60"))

def _looks_like_policy(text: str) -> bool:
    t = (text or "").lower()
    keys = ["quy định", "chính sách", "hướng dẫn", "nội quy", "quy trình", "sổ tay", "policy", "handbook"]
    return any(k in t for k in keys)

def _strip_policy_part(text: str) -> str:
    # tách phần hỏi policy đơn giản: lấy từ "quy định/chính sách..." về sau
    t = text or ""
    lowers = t.lower()
    marks = ["quy định", "chính sách", "hướng dẫn", "nội quy", "quy trình", "sổ tay", "policy", "handbook"]
    idxs = [lowers.find(m) for m in marks if lowers.find(m) >= 0]
    if not idxs:
        return t
    i = min(idxs)
    return t[i:].strip()

def _strip_db_part(text: str) -> str:
    # tách phần DB đơn giản: lấy trước "và" nếu sau "và" là policy
    t = text or ""
    lowers = t.lower()
    if " và " in lowers:
        parts = t.split(" và ")
        if len(parts) >= 2 and _looks_like_policy(parts[-1]):
            return parts[0].strip()
    return t.strip()

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
    compose_enabled: bool = True,
    debug: bool = False,
) -> Dict[str, Any]:
    module = (module or "auto").strip()
    msg = (message or "").strip()

    det: Optional[Dict[str, Any]] = None
    selected_module: Optional[str] = None
    confidence: float = 0.0

    # ===== PHA A Detect =====
    if module == "auto":
        det = detect_module_llm(message=msg, role=role)
        selected_module = det.get("selected_module")
        confidence = _as_float(det.get("confidence"), 0.0)

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
        step_infos = make_error_step("__permission_check__", msg_err, code="PERMISSION_DENIED",
                                    meta={"module": selected_module or module, "reason": "rbac_or_scope", "question": msg})
        out = {"ok": False, "module": selected_module or module, "answer": msg_err, "steps": step_infos}
        if debug:
            out["debug_error"] = {"type": type(e).__name__, "message": msg_err}
        return out

    except Exception as e:
        tb = traceback.format_exc()

        step_infos = make_error_step("__system__", "Hệ thống gặp lỗi khi xử lý yêu cầu.", code="INTERNAL_ERROR")
        out = {"ok": False, "module": selected_module or module, "answer": "Hệ thống gặp lỗi khi xử lý yêu cầu.", "steps": step_infos}

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
