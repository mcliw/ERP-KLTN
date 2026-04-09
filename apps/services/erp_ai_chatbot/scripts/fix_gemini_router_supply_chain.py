from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def write(rel_path: str, content: str):
    p = ROOT / rel_path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    print(f"[WRITE] {rel_path}")

def main():
    # 1) Force UTF-8 response for PowerShell (chat + health)
    write("app/api/v1/chat.py", r'''
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from app.ai.executor import execute_chat

router = APIRouter()

class ChatRequest(BaseModel):
    module: str  # hrm | sale_crm | finance_accounting | supply_chain
    user_id: int | None = None
    role: str | None = None
    message: str

@router.post("/chat")
def chat(req: ChatRequest):
    result = execute_chat(
        module=req.module,
        user_id=req.user_id,
        role=req.role,
        message=req.message
    )
    # Thêm charset để PowerShell decode đúng UTF-8
    return JSONResponse(content=result, media_type="application/json; charset=utf-8")
'''.lstrip())

    write("app/api/v1/health.py", r'''
from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter()

@router.get("/health")
def health():
    return JSONResponse(content={"status": "ok"}, media_type="application/json; charset=utf-8")
'''.lstrip())

    # 2) Executor: render BOTH {{...}} and {...} (fallback) để tránh LLM sai format
    write("app/ai/executor.py", r'''
from __future__ import annotations
import re
from typing import Any, Dict
from app.core.rbac import check_role
from app.core.audit_log import audit
from app.core.errors import PermissionDenied, ToolExecutionError
from app.ai.router import plan_route
from app.ai.plan_validator import validate_plan
from app.ai.module_registry import get_tool
from app.ai.tooling import ToolSpec

from app.db.supply_chain_database import SupplyChainSessionLocal

# {{s1.data.xxx}} (chuẩn)
VAR_DBL_RE = re.compile(r"\{\{\s*([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+|\[[0-9]+\])*)\s*\}\}")
# {s1.data.xxx} (fallback) — chỉ match nếu bắt đầu bằng s<digit> để tránh đụng JSON
VAR_SGL_RE = re.compile(r"\{\s*(s[0-9]+(?:\.[a-zA-Z0-9_]+|\[[0-9]+\])*)\s*\}")

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

def _render_template(tpl: str, store: dict) -> str:
    def repl(match):
        path = match.group(1)
        try:
            val = _get_path(store, path)
            return "" if val is None else str(val)
        except Exception:
            return match.group(0)

    # render {{...}} trước, rồi render {...} fallback
    out = VAR_DBL_RE.sub(repl, tpl)
    out = VAR_SGL_RE.sub(repl, out)
    return out

def _resolve_args(args: Dict[str, Any], store: dict) -> Dict[str, Any]:
    out = {}
    for k, v in args.items():
        if isinstance(v, str):
            out[k] = _render_template(v, store)
        else:
            out[k] = v
    return out

def _execute_tool(module: str, tool: ToolSpec, args: Dict[str, Any]) -> Dict[str, Any]:
    if module == "supply_chain":
        session = SupplyChainSessionLocal()
        try:
            parsed = tool.args_model.model_validate(args)
            result = tool.handler(session=session, **parsed.model_dump())
            return result
        except Exception as e:
            raise ToolExecutionError(str(e))
        finally:
            session.close()

    raise ToolExecutionError(f"Chưa hỗ trợ executor cho module '{module}'.")

def execute_chat(module: str, user_id: int | None, role: str | None, message: str):
    if not check_role(module, role):
        raise PermissionDenied(f"Role '{role}' không được phép dùng chatbot module '{module}'.")

    auth = {"user_id": user_id, "role": role, "is_authenticated": True}

    plan = plan_route(module=module, message=message, auth=auth)
    audit({"event": "plan_created", "module": module, "plan": plan.model_dump()})

    if plan.needs_clarification:
        return {"answer": plan.clarifying_question, "plan": plan.model_dump()}

    validate_plan(plan)

    store: Dict[str, Any] = {}
    for step in plan.steps:
        tool = get_tool(plan.module, step.tool)
        if tool is None:
            raise ToolExecutionError(f"Không tìm thấy tool '{step.tool}' trong module '{plan.module}'.")

        resolved_args = _resolve_args(step.args, store)
        audit({"event": "tool_call", "module": plan.module, "tool": step.tool, "args": resolved_args})

        result = _execute_tool(plan.module, tool, resolved_args)
        audit({"event": "tool_result", "module": plan.module, "tool": step.tool, "result": result})

        if isinstance(result, dict) and result.get("needs_clarification"):
            return {"answer": result.get("question"), "candidates": result.get("candidates"), "plan": plan.model_dump()}

        store[step.id] = result
        if step.save_as:
            store[step.save_as] = result

    if plan.final_response_template:
        answer = _render_template(plan.final_response_template, store)
        return {"answer": answer, "data": store, "plan": plan.model_dump()}

    return {"answer": "Đã tra cứu xong.", "data": store, "plan": plan.model_dump()}
'''.lstrip())

    # 3) Gemini Router: khóa tool name bằng enum + ép dùng {{...}} + đưa “contract output keys” cho tool chính
    write("app/ai/router.py", r'''
from __future__ import annotations

import json
import os
from copy import deepcopy
from typing import Dict, Any, List

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
    "required": ["module", "intent", "needs_clarification", "steps"],
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
                    "id": {"type": "string"},
                    "tool": {"type": "string"},
                    "args": {"type": "object"},
                    "save_as": {"type": ["string", "null"]},
                },
            },
        },
        "final_response_template": {"type": ["string", "null"]},
    },
}

def _schema_for_module(module: str) -> Dict[str, Any]:
    schema = deepcopy(PLAN_JSON_SCHEMA_BASE)
    tool_names = [t.ten_tool for t in list_tools(module)]
    # khóa tool bằng enum để model không bịa tên tool
    schema["properties"]["steps"]["items"]["properties"]["tool"]["enum"] = tool_names
    return schema

def _tool_catalog(module: str) -> str:
    tools = list_tools(module)
    lines = []
    for t in tools:
        fields = []
        for name, f in t.args_model.model_fields.items():
            required = f.is_required()
            ann = getattr(f.annotation, "__name__", str(f.annotation))
            fields.append(f"{name}{'' if required else '?'}:{ann}")
        lines.append(f"- {t.ten_tool}: {t.mo_ta} | args: {', '.join(fields)}")
    return "\n".join(lines) if lines else "(module chưa có tools)"

def _tool_output_contracts_supply_chain() -> str:
    # Chỉ mô tả tool chính để model KHÔNG bịa field.
    return """
QUY ƯỚC OUTPUT (data keys) — KHÔNG ĐƯỢC BỊA:
1) tra_cuu_ton_kho_theo_sku -> result: {"ok":true,"data":{
   "sku":str,"product_name":str,
   "total_on_hand":int,"total_allocated":int,"total_available":int,
   "details":[{"warehouse_code":str,"warehouse_name":str,"bin_code":str|null,"on_hand":int,"allocated":int,"available":int}]
}}
2) tra_cuu_trang_thai_don_mua -> data keys:
   "po_code","status","order_date","expected_delivery_date","supplier_code","supplier_name",
   "total_amount","tax_amount","discount_amount"
3) chi_tiet_po -> data keys:
   "po_code","status","supplier_code","supplier_name","items":[{"sku","product_name","quantity_ordered","quantity_received","unit_price"}]
Ghi chú: tool luôn wrap trong {"ok":true,"data":...}. Template phải truy cập qua sX.data.<field>.
""".strip()

def _build_system_instruction(module: str, auth: dict) -> str:
    return f"""
Bạn là Router cho chatbot ERP. Bạn KHÔNG trả lời người dùng trực tiếp.
Bạn chỉ xuất 1 PLAN JSON theo schema (response_json_schema). Không thêm text ngoài JSON.

Bối cảnh:
- Module hiện tại: {module}
- Role: {auth.get("role")}

Quy tắc bắt buộc:
1) Chỉ dùng tools thuộc module hiện tại.
2) Không bịa tên tool (tool đã bị khóa enum). Không bịa tham số: thiếu thông tin => needs_clarification=true.
3) Nếu câu hỏi ngoài phạm vi module => needs_clarification=true và hướng dẫn chuyển module đúng.
4) Multi-step: tạo steps theo thứ tự s1,s2,s3...
5) Truyền dữ liệu giữa steps bằng placeholder CHỈ dùng dạng: {{s1.data.xxx}} hoặc {{s1.data.items[0].sku}}
   - Tuyệt đối KHÔNG dùng {s1...} một ngoặc.
6) final_response_template phải ngắn gọn, tiếng Việt, chỉ dùng placeholder đúng theo output keys.

Danh sách tools khả dụng:
{_tool_catalog(module)}

{_tool_output_contracts_supply_chain() if module == "supply_chain" else ""}
""".strip()

def plan_route(module: str, message: str, auth: dict) -> Plan:
    msg = (message or "").strip()

    if module != "supply_chain":
        return Plan(
            module=module,
            intent="ngoai_pham_vi",
            needs_clarification=True,
            clarifying_question=(
                f"Bạn đang ở module '{module}'. Hiện mình mới triển khai FN-2 cho module 'supply_chain'. "
                f"Bạn chuyển sang Supply Chain để tra cứu tồn kho/PO/GR/GI/nhà cung cấp."
            ),
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
            clarifying_question="Router không nhận được output từ Gemini. Bạn thử hỏi lại câu ngắn hơn.",
            steps=[],
            final_response_template=None,
        )

    try:
        data = json.loads(text)
        return Plan.model_validate(data)
    except Exception:
        try:
            return Plan.model_validate_json(text)
        except Exception:
            return Plan(
                module=module,
                intent="router_parse_error",
                needs_clarification=True,
                clarifying_question="Router không parse được PLAN JSON. Bạn thử hỏi lại theo dạng: 'Tra tồn kho SKU IP15-128' hoặc 'Trạng thái PO-20250001'.",
                steps=[],
                final_response_template=None,
            )
'''.lstrip())

    print("\nDONE. Hãy restart uvicorn sau khi patch.")

if __name__ == "__main__":
    main()
