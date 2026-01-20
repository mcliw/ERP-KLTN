# app/ai/routers/common.py
from __future__ import annotations

import json
import os
import re
from copy import deepcopy
from typing import Any, Dict, List, Optional
from datetime import datetime
from zoneinfo import ZoneInfo

from dotenv import load_dotenv
from google import genai

from app.ai.plan_schema import Plan
from app.ai.module_registry import list_tools
from app.ai.prompts.planner_registry import get_planner_guide

load_dotenv()

_GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
_GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
_client = genai.Client(api_key=_GEMINI_API_KEY) if _GEMINI_API_KEY else genai.Client()

PLAN_JSON_SCHEMA_BASE = {
    "type": "object",
    "additionalProperties": False,
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
                "additionalProperties": False,
                # nếu bạn KHÔNG muốn bắt buộc save_as thì bỏ "save_as" khỏi required
                "required": ["id", "module", "tool", "args", "save_as"],
                "properties": {
                    "id": {"type": "string", "pattern": "^s[0-9]+$"},
                    "module": {"type": "string"},
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

    # ✅ khóa luôn step.module = module (để planner không nhảy module)
    schema["properties"]["steps"]["items"]["properties"]["module"]["enum"] = [module]
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

def normalize_plan_dict(d: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(d, dict):
        return d

    steps = d.get("steps")
    if isinstance(steps, list):
        for st in steps:
            if not isinstance(st, dict):
                continue

            # 0) normalize id -> sN (hỗ trợ: 1, "step_1", "Step 1", "s1")
            sid = st.get("id")
            if isinstance(sid, int):
                st["id"] = f"s{sid}"
            elif isinstance(sid, str):
                s0 = sid.strip()
                m = re.search(r"(\d+)$", s0)
                if m:
                    st["id"] = f"s{int(m.group(1))}"

            # 1) tool alias: tool_code/tool_name -> tool
            if "tool" not in st:
                st["tool"] = st.pop("tool_code", None) or st.pop("tool_name", None)

            # 2) args alias: tool_input -> args
            if "args" not in st and "tool_input" in st:
                st["args"] = st.pop("tool_input")

            # 3) args string JSON -> dict
            if "args" in st and isinstance(st["args"], str):
                s = st["args"].strip()
                if s.startswith("{") and s.endswith("}"):
                    try:
                        st["args"] = json.loads(s)
                    except Exception:
                        pass

            # 4) đảm bảo args là dict tối thiểu
            if "args" not in st or st["args"] is None or not isinstance(st["args"], dict):
                st["args"] = {}

            # 5) nếu thiếu module trong step -> fill theo plan.module
            if not st.get("module"):
                st["module"] = d.get("module")

            # 6) nếu thiếu save_as -> set None (để pass schema nếu required)
            if "save_as" not in st:
                st["save_as"] = None

    return d


def build_system_instruction(module: str, auth: dict, extra_hints: Optional[List[str]] = None) -> str:
    now = datetime.now(ZoneInfo("Asia/Bangkok")).strftime("%Y-%m-%d")

    parts: List[str] = []
    parts.append("Bạn là Router/Planner cho chatbot ERP. Bạn KHÔNG trả lời người dùng trực tiếp.")
    parts.append("Bạn CHỈ xuất 1 PLAN JSON theo schema (response_json_schema). Không thêm text ngoài JSON.")
    parts.append("")
    parts.append(f"Ngày hệ thống: {now} (Asia/Bangkok). Dùng để hiểu 'hôm nay/tháng này'.")
    parts.append(f"Module hiện tại: {module}")
    parts.append(f"Role: {auth.get('role')}")
    parts.append("")

    parts.append("RÀNG BUỘC FORMAT (BẮT BUỘC TUÂN THỦ):")
    parts.append("- Output phải là JSON object duy nhất, KHÔNG markdown, KHÔNG giải thích.")
    parts.append("- Tuyệt đối KHÔNG dùng các key sai như: tool_code, tool_name, tool_input.")
    parts.append("- Mỗi step CHỈ dùng key: id, module, tool, args, save_as.")
    parts.append("- args BẮT BUỘC là JSON object (ví dụ {\"employee_code\":\"a20006\"}), KHÔNG được là string dạng \"{...}\".")
    parts.append("- Nếu thiếu bất kỳ arg required nào => needs_clarification=true và steps=[].")
    parts.append("")

    
    guide = get_planner_guide(module)
    if guide:
        parts.append("HƯỚNG DẪN LẬP PLAN THEO MODULE:")
        parts.append(guide)
        parts.append("")

    if extra_hints:
        parts.append("Gợi ý bổ sung (extra_hints):")
        parts.extend([f"- {h}" for h in extra_hints])
        parts.append("")

    parts.append("Tools khả dụng:")
    parts.append(tool_catalog(module))
    return "\n".join(parts)

def gemini_fallback(module: str, message: str, auth: dict, extra_hints: Optional[List[str]] = None) -> Plan:
    msg = (message or "").strip()
    schema = schema_for_module(module)

    def _call(sys_text: str) -> str:
        resp = _client.models.generate_content(
            model=_GEMINI_MODEL,
            contents=f"USER_MESSAGE:\n{msg}",
            config={
                "system_instruction": sys_text,
                "temperature": 0.0,
                "response_mime_type": "application/json",
                "response_json_schema": schema,
            },
        )
        return (resp.text or "").strip()

    def _parse(t: str) -> Plan | None:
        try:
            data = json.loads(t)
            data = normalize_plan_dict(data)
            return Plan.model_validate(data)
        except Exception:
            return None

    # Call lần 1
    sys = build_system_instruction(module, auth, extra_hints=extra_hints)
    text = _call(sys)

    print("=== ROUTER_RAW ===")
    print(text)
    print("=== /ROUTER_RAW ===")

    if not text:
        return Plan(
            module=module,
            intent="router_error",
            needs_clarification=True,
            clarifying_question="Router không nhận được output từ Gemini.",
            steps=[],
            final_response_template=None,
        )

    plan = _parse(text)

    # Retry lần 2 (thắt chặt)
    if plan is None:
        retry_hints = [
            "Output MUST be a single valid JSON object. No markdown, no comments.",
            "Do NOT output schema/types like 'string'. Fill real values.",
            "steps[i].id MUST be s1,s2,... ; steps[i].args MUST be an object, not a string.",
            "Each step MUST contain ONLY keys: id, module, tool, args, save_as.",
        ]
        sys2 = build_system_instruction(module, auth, extra_hints=(extra_hints or []) + retry_hints)
        text2 = _call(sys2)

        print("=== ROUTER_RAW_RETRY ===")
        print(text2)
        print("=== /ROUTER_RAW_RETRY ===")

        plan = _parse(text2)

        if plan is None:
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

