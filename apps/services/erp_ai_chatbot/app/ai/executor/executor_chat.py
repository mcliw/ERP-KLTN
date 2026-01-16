# app/ai/executor/executor_chat.py
from __future__ import annotations

import os
from typing import Any, Dict, Optional

from app.ai.module_detector import detect_module_llm

# import các executor module bạn đã có sẵn
from app.ai.executor.executor_hrm import execute_chat_hrm
from app.ai.executor.executor_supply_chain import execute_chat_supply_chain
from app.ai.executor.executor_sale_crm import execute_chat_sale_crm
from app.ai.executor.executor_finance_accounting import execute_chat_finance_accounting


VALID_MODULES = {"hrm", "supply_chain", "sale_crm", "finance_accounting"}
MODULE_DETECT_THRESHOLD = float(os.getenv("MODULE_DETECT_THRESHOLD", "0.60"))


def _as_float(x, default=0.0) -> float:
    try:
        return float(x)
    except Exception:
        return default


def execute_chat_unified(
    module: str,
    user_id: int | None,
    role: str | None,
    message: str,
    paraphrase_enabled: bool = True,
    compose_enabled: bool = True,
    debug: bool = False,
) -> Dict[str, Any]:
    module = (module or "auto").strip()
    msg = (message or "").strip()

    det: Optional[Dict[str, Any]] = None
    selected_module: Optional[str] = None
    confidence: float = 0.0

    # =========================
    # PHA A — Detect module (LLM #1)
    # =========================
    if module == "auto":
        det = detect_module_llm(message=msg, role=role)
        selected_module = det.get("selected_module")
        confidence = _as_float(det.get("confidence"), 0.0)

        needs_clar = bool(det.get("needs_clarification"))
        if (not selected_module) or needs_clar or (confidence < MODULE_DETECT_THRESHOLD):
            q = det.get("clarifying_question") or "Bạn muốn hỏi thuộc module nào: hrm / supply_chain / sale_crm / finance_accounting?"
            # trả về y như bạn đang làm: chỉ hỏi chọn module, KHÔNG chạy tools
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

        # sanitize: nếu đã đủ chắc thì ép clear
        # (tránh trường hợp LLM lỡ set needs_clarification=true dù confidence cao)
        module = selected_module

    else:
        # user chỉ định module cụ thể
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

    # =========================
    # PHA B + C — Delegate sang executor module
    # (B: router sinh plan) + (C: compose answer)
    # =========================
    if selected_module == "hrm":
        res = execute_chat_hrm(
            module="hrm",
            user_id=user_id,
            role=role,
            message=msg,
            paraphrase_enabled=paraphrase_enabled,
            compose_enabled=compose_enabled,
        )
    elif selected_module == "supply_chain":
        res = execute_chat_supply_chain(
            module="supply_chain",
            user_id=user_id,
            role=role,
            message=msg,
            paraphrase_enabled=paraphrase_enabled,
            compose_enabled=compose_enabled,
        )
    elif selected_module == "sale_crm":
        res = execute_chat_sale_crm(
            module="sale_crm",
            user_id=user_id,
            role=role,
            message=msg,
            paraphrase_enabled=paraphrase_enabled,
            compose_enabled=compose_enabled,
        )
    else:  # finance_accounting
        res = execute_chat_finance_accounting(
            module="finance_accounting",
            user_id=user_id,
            role=role,
            message=msg,
            paraphrase_enabled=paraphrase_enabled,
            compose_enabled=compose_enabled,
        )

    # gắn metadata (để debug detector + module)
    res = dict(res or {})
    res = dict(res or {})

    # ✅ đảm bảo schema đồng nhất giữa các module
    res.setdefault("composed_used", False)
    res.setdefault("compose_error", None)
    res.setdefault("data", {})
    res.setdefault("plan", {})

    res["selected_module"] = selected_module
    res["confidence"] = confidence

    # ✅ debug=True => trả FULL (plan + data + composed_used + compose_error ...)
    if debug:
        if det:
            res["detector"] = det
        # đảm bảo key tồn tại (tránh module nào đó quên set)
        res.setdefault("plan", None)
        res.setdefault("data", {})
        return res

    # debug=False => trả gọn, nhưng vẫn giữ plan (nếu bạn muốn xem steps)
    out = {
        "answer": res.get("answer"),
        "selected_module": selected_module,
        "confidence": confidence,
        "plan": res.get("plan"),   # ✅ giữ plan để nhìn steps
    }
    if "candidates" in res:
        out["candidates"] = res["candidates"]
    return out
