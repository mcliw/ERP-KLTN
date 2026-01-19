from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def write(rel_path: str, content: str):
    p = ROOT / rel_path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    print(f"[WRITE] {rel_path}")

def main():
    # ========== (A) API: trả answer-only mặc định, debug=true thì trả full ==========
    write("app/api/v1/chat.py", r'''
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from app.ai.executor import execute_chat

router = APIRouter()

class ChatRequest(BaseModel):
    module: str
    user_id: int | None = None
    role: str | None = None
    message: str
    debug: bool = False  # NEW

@router.post("/chat")
def chat(req: ChatRequest):
    result = execute_chat(
        module=req.module,
        user_id=req.user_id,
        role=req.role,
        message=req.message
    )

    # Mặc định trả gọn để PowerShell không bị cắt cột
    if not req.debug:
        out = {"answer": result.get("answer")}
        if "candidates" in result:
            out["candidates"] = result["candidates"]
        return JSONResponse(content=out, media_type="application/json; charset=utf-8")

    # debug trả full
    return JSONResponse(content=result, media_type="application/json; charset=utf-8")
'''.lstrip())

    # ========== (B) Router: khóa module + tool enum + bắt final_response_template = null ==========
    write("app/ai/router.py", r'''
from __future__ import annotations

import json
import os
from copy import deepcopy
from typing import Dict, Any

from dotenv import load_dotenv
from google import genai

from app.ai.plan_schema import Plan
from app.ai.module_registry import list_tools

load_dotenv()

_GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
_GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
_client = genai.Client(api_key=_GEMINI_API_KEY) if _GEMINI_API_KEY else genai.Client()

VALID_MODULES = {"supply_chain", "sale_crm", "hrm", "finance_accounting"}

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
        # ÉP NULL: để tránh LLM sinh template sai; Executor sẽ compose answer từ data
        "final_response_template": {"type": "null"},
    },
}

def _schema_for_module(module: str) -> Dict[str, Any]:
    schema = deepcopy(PLAN_JSON_SCHEMA_BASE)
    schema["properties"]["module"]["enum"] = [module]

    tool_names = [t.ten_tool for t in list_tools(module)]
    schema["properties"]["steps"]["items"]["properties"]["tool"]["enum"] = tool_names
    return schema

def _tool_catalog(module: str) -> str:
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

def _detect_other_module(message: str) -> str | None:
    m = (message or "").lower()
    if any(k in m for k in ["đơn hàng", "khách hàng", "crm", "cskh", "voucher", "giỏ hàng", "đặt hàng"]):
        return "sale_crm"
    if any(k in m for k in ["nhân viên", "lương", "chấm công", "nghỉ phép", "phòng ban", "tuyển dụng"]):
        return "hrm"
    if any(k in m for k in ["hóa đơn", "công nợ", "kế toán", "thu chi", "bút toán", "vat", "đối soát"]):
        return "finance_accounting"
    return None

def _should_use_rag(message: str) -> bool:
    m = (message or "").lower()
    return any(k in m for k in ["chính sách", "bảo hành", "đổi trả", "vận chuyển", "hướng dẫn", "faq", "quy trình"])

def _build_system_instruction(module: str, auth: dict) -> str:
    parts = []
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
    parts.append("")
    parts.append("Gợi ý chọn tool:")
    parts.append("- Chính sách/hướng dẫn/FAQ: tra_cuu_kho_tri_thuc.")
    parts.append("- Tra cứu DB tổng quát: thuc_hien_truy_van_danh_muc.")
    parts.append("")
    parts.append("Tools khả dụng:")
    parts.append(_tool_catalog(module))
    return "\n".join(parts)

def plan_route(module: str, message: str, auth: dict) -> Plan:
    msg = (message or "").strip()

    if module not in VALID_MODULES:
        return Plan(
            module=module,
            intent="module_khong_hop_le",
            needs_clarification=True,
            clarifying_question="Module không hợp lệ. Module hợp lệ: supply_chain, sale_crm, hrm, finance_accounting.",
            steps=[],
            final_response_template=None,
        )

    other = _detect_other_module(msg)
    if other and other != module:
        return Plan(
            module=module,
            intent="dieu_huong_module",
            needs_clarification=True,
            clarifying_question=f"Câu hỏi này thuộc module '{other}'. Bạn chuyển chatbot sang '{other}' để tra cứu chính xác.",
            steps=[],
            final_response_template=None,
        )

    if module == "supply_chain" and _should_use_rag(msg):
        return Plan(
            module=module,
            intent="rag",
            needs_clarification=False,
            steps=[{
                "id": "s1",
                "tool": "tra_cuu_kho_tri_thuc",
                "args": {"cau_hoi": msg, "top_k": 4},
                "save_as": None
            }],
            final_response_template=None,
        )

    if module != "supply_chain":
        return Plan(
            module=module,
            intent="chua_ho_tro",
            needs_clarification=True,
            clarifying_question="Hiện mới demo đầy đủ module supply_chain.",
            steps=[],
            final_response_template=None,
        )

    sys = _build_system_instruction(module, auth)
    schema = _schema_for_module(module)

    resp = _client.models.generate_content(
        model=_GEMINI_MODEL,
        contents=f"USER_MESSAGE:\n{msg}",
        config={
            "system_instruction": sys,
            "temperature": 0,
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

    # Force module + force no template (đề phòng model lách)
    if plan.module != module:
        plan = plan.model_copy(update={"module": module})
    if plan.final_response_template is not None:
        plan = plan.model_copy(update={"final_response_template": None})

    return plan
'''.lstrip())

    print("DONE. Restart uvicorn.")

if __name__ == "__main__":
    main()
