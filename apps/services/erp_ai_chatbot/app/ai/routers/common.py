from __future__ import annotations

import json
import os
import re
from copy import deepcopy
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from google import genai

from app.ai.plan_schema import Plan
from app.ai.module_registry import list_tools

load_dotenv()

_GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
_GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
_client = genai.Client(api_key=_GEMINI_API_KEY) if _GEMINI_API_KEY else genai.Client()

PLAN_JSON_SCHEMA_BASE: Dict[str, Any] = {
    "type": "object",
    "required": ["module", "intent", "needs_clarification", "steps", "final_response_template"],
    "properties": {
        "module": {"type": "string"},
        "intent": {"type": "string"},
        "needs_clarification": {"type": "boolean"},
        "clarifying_question": {"type": ["string", "null"]},
        "steps": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["id", "tool", "args"],
                "properties": {
                    "id": {"type": "string", "pattern": "^s[0-9]+$"},
                    "tool": {"type": "string"},
                    "args": {"type": "object"},
                    "save_as": {"type": ["string", "null"]},
                },
            },
        },
        "final_response_template": {"type": "null"},
    },
}

def schema_for_module(module: str) -> Dict[str, Any]:
    schema = deepcopy(PLAN_JSON_SCHEMA_BASE)
    schema["properties"]["module"]["enum"] = [module]
    tool_names = [t.ten_tool for t in list_tools(module)]
    schema["properties"]["steps"]["items"]["properties"]["tool"]["enum"] = tool_names
    return schema

def tool_catalog(module: str) -> str:
    tools = list_tools(module)
    if not tools:
        return "(module chưa có tools)"
    lines = []
    for t in tools:
        fields = []
        for name, f in t.args_model.model_fields.items():
            required = f.is_required()
            ann = getattr(f.annotation, "__name__", str(f.annotation))
            fields.append(f"{name}{'' if required else '?'}:{ann}")
        lines.append(f"- {t.ten_tool}: {t.mo_ta} | args: {', '.join(fields)}")
    return "\n".join(lines)

def should_use_rag(message: str) -> bool:
    m = (message or "").lower()
    return any(k in m for k in ["chính sách", "bảo hành", "đổi trả", "vận chuyển", "hướng dẫn", "faq", "quy trình"])

def build_system_instruction(module: str, auth: dict, extra_hints: Optional[List[str]] = None) -> str:
    parts: List[str] = []
    parts.append("Bạn là Router cho chatbot ERP. Bạn KHÔNG trả lời người dùng trực tiếp.")
    parts.append("Bạn chỉ xuất 1 PLAN JSON theo schema (response_json_schema). Không thêm text ngoài JSON.")
    parts.append("")
    parts.append(f"Module hiện tại: {module}")
    parts.append(f"Role: {auth.get('role')}")
    parts.append("")
    parts.append("Quy tắc bắt buộc:")
    parts.append("1) steps.id luôn là s1, s2, s3... theo thứ tự.")
    parts.append("2) Chỉ dùng tool thuộc module hiện tại (tool đã bị khóa enum).")
    parts.append("3) Thiếu thông tin => needs_clarification=true và đặt clarifying_question.")
    parts.append("4) final_response_template BẮT BUỘC null.")
    parts.append("5) Chỉ điều hướng sang supply_chain khi câu chỉ nói về tồn kho (không có các keyword sale_crm như “đánh giá, voucher, đơn hàng, thanh toán, khách hàng…”).")
    parts.append("6) final_response_template BẮT BUỘC null.")
    parts.append("")

    if extra_hints:
        parts.append("Gợi ý chọn tool:")
        parts.extend([f"- {h}" for h in extra_hints])
        parts.append("")

    parts.append("Tools khả dụng:")
    parts.append(tool_catalog(module))
    return "\n".join(parts)

def gemini_fallback(module: str, message: str, auth: dict, extra_hints: Optional[List[str]] = None) -> Plan:
    msg = (message or "").strip()
    sys = build_system_instruction(module, auth, extra_hints=extra_hints)
    schema = schema_for_module(module)

    resp = _client.models.generate_content(
        model=_GEMINI_MODEL,
        contents=f"USER_MESSAGE:\n{msg}",
        config={
            "system_instruction": sys,
            "temperature": 0.1,
            "response_mime_type": "application/json",
            "response_json_schema": schema,
        },
    )

    text = (resp.text or "").strip()
    if not text:
        return Plan(
            module=module,
            intent="router_error",
            needs_clarification=True,
            clarifying_question="Router không nhận được output từ Gemini.",
            steps=[],
            final_response_template=None,
        )

    try:
        data = json.loads(text)
        plan = Plan.model_validate(data)
    except Exception:
        try:
            plan = Plan.model_validate_json(text)
        except Exception:
            return Plan(
                module=module,
                intent="router_parse_error",
                needs_clarification=True,
                clarifying_question="Router không parse được PLAN JSON.",
                steps=[],
                final_response_template=None,
            )

    # Force module + force no template
    if plan.module != module:
        plan = plan.model_copy(update={"module": module})
    if plan.final_response_template is not None:
        plan = plan.model_copy(update={"final_response_template": None})
    if plan.needs_clarification:
        plan = plan.model_copy(update={"steps": []})

    return plan
