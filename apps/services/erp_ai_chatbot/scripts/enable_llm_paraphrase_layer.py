from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def write(rel_path: str, content: str):
    p = ROOT / rel_path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    print(f"[WRITE] {rel_path}")

def main():
    # (A) Paraphraser module
    write("app/ai/paraphraser.py", r'''
from __future__ import annotations

import json
import os
import re
from typing import Any, Dict, Optional

from dotenv import load_dotenv
from google import genai

load_dotenv()

_GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
_PARAPHRASE_MODEL = os.getenv("GEMINI_PARAPHRASE_MODEL", os.getenv("GEMINI_MODEL", "gemini-2.5-flash"))
_ENABLE = (os.getenv("ENABLE_PARAPHRASE", "true").strip().lower() in {"1", "true", "yes", "y"})

_client = genai.Client(api_key=_GEMINI_API_KEY) if _GEMINI_API_KEY else genai.Client()

_NUM_RE = re.compile(r"\d+")
_CODE_RE = re.compile(r"\b[A-Z]{2,}-\d+\b")  # PO-20250001, GR-..., GI-...

def _allowed_text(deterministic_answer: str, facts: Dict[str, Any]) -> str:
    try:
        facts_json = json.dumps(facts, ensure_ascii=False)
    except Exception:
        facts_json = str(facts)
    return deterministic_answer + "\n" + facts_json

def _extract_numbers(text: str) -> set[str]:
    return set(_NUM_RE.findall(text or ""))

def _extract_codes(text: str) -> set[str]:
    return set(_CODE_RE.findall(text or ""))

def _safe_enough(paraphrased: str, allowed: str) -> bool:
    # 1) không quá dài (tránh lan man)
    if not paraphrased or len(paraphrased) > 650:
        return False

    # 2) không được tạo số mới
    pn = _extract_numbers(paraphrased)
    an = _extract_numbers(allowed)
    if not pn.issubset(an):
        return False

    # 3) không được tạo mã chứng từ mới
    pc = _extract_codes(paraphrased)
    ac = _extract_codes(allowed)
    if not pc.issubset(ac):
        return False

    # 4) không được tự chèn dấu "..." mơ hồ
    if "..." in paraphrased:
        return False

    return True

def paraphrase_answer(
    deterministic_answer: str,
    facts: Dict[str, Any],
    enabled: bool = True
) -> str:
    """
    - deterministic_answer: câu trả lời chuẩn do code sinh ra (đúng facts)
    - facts: data thật từ tools (ví dụ store['s1'])
    - enabled: bật/tắt theo request
    """
    if not _ENABLE or not enabled:
        return deterministic_answer

    # nếu answer quá ngắn thì khỏi paraphrase
    if not deterministic_answer or len(deterministic_answer) < 12:
        return deterministic_answer

    allowed = _allowed_text(deterministic_answer, facts)

    sys = (
        "Bạn là lớp Paraphrase cho chatbot ERP.\n"
        "NHIỆM VỤ: viết lại (diễn đạt lại) câu trả lời cho tự nhiên, ngắn gọn, tiếng Việt.\n"
        "RÀNG BUỘC BẮT BUỘC:\n"
        "1) CHỈ được dùng thông tin có trong FACTS_JSON và ANSWER_GOC.\n"
        "2) KHÔNG được thêm số liệu, mã chứng từ, trạng thái, ngày tháng, tên sản phẩm mới.\n"
        "3) Nếu không chắc, trả lại nguyên văn ANSWER_GOC.\n"
        "4) Không dùng dấu '...'.\n"
        "Trả về đúng 1 đoạn text, không markdown, không giải thích.\n"
    )

    prompt = (
        "ANSWER_GOC:\n"
        f"{deterministic_answer}\n\n"
        "FACTS_JSON:\n"
        f"{json.dumps(facts, ensure_ascii=False)}\n"
    )

    try:
        resp = _client.models.generate_content(
            model=_PARAPHRASE_MODEL,
            contents=prompt,
            config={
                "system_instruction": sys,
                "temperature": 0,  # để hạn chế sáng tác
                "response_mime_type": "text/plain",
            },
        )
        out = (resp.text or "").strip()
        if not out:
            return deterministic_answer

        # Guardrail kiểm tra số/mã
        if not _safe_enough(out, allowed):
            return deterministic_answer

        return out
    except Exception:
        return deterministic_answer
'''.lstrip())

    # (B) Patch executor: gọi paraphrase sau khi có answer cuối
    # Ghi đè đoạn cuối executor theo kiểu "minimal change": thêm tham số paraphrase_enabled + gọi paraphraser
    write("app/ai/executor.py", r'''
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

from app.db.supply_chain_database import SupplyChainSessionLocal
from app.ai.paraphraser import paraphrase_answer

VAR_DBL_RE = re.compile(r"\{\{\s*([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+|\[[0-9]+\])*)\s*\}\}")
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

    out = VAR_DBL_RE.sub(repl, tpl)
    out = VAR_SGL_RE.sub(repl, out)
    return out

def _resolve_args(args: Dict[str, Any], store: dict) -> Dict[str, Any]:
    out = {}
    for k, v in args.items():
        out[k] = _render_template(v, store) if isinstance(v, str) else v
    return out

def _execute_tool(module: str, tool: ToolSpec, args: Dict[str, Any]) -> Dict[str, Any]:
    if module == "supply_chain":
        session = SupplyChainSessionLocal()
        try:
            parsed = tool.args_model.model_validate(args)
            return tool.handler(session=session, **parsed.model_dump())
        except Exception as e:
            raise ToolExecutionError(str(e))
        finally:
            session.close()
    raise ToolExecutionError(f"Chưa hỗ trợ executor cho module '{module}'.")

def _s(v, default="N/A"):
    if v is None: return default
    if isinstance(v, str) and not v.strip(): return default
    return v

def _fmt_list(lines: List[str], limit: int = 7) -> str:
    if not lines: return ""
    shown = lines[:limit]
    more = len(lines) - len(shown)
    return "\n".join(shown) + (f"\n(+{more} dòng)" if more > 0 else "")

def _fallback_from_data(data: Any) -> Optional[str]:
    # RAG
    if isinstance(data, dict) and "answer" in data and "sources" in data and isinstance(data["sources"], list):
        src_lines = []
        for s in data["sources"][:4]:
            if isinstance(s, dict):
                src_lines.append(f"- {s.get('source')}: {s.get('snippet')}")
        return f"{data.get('answer')}\n\nNguồn tham khảo:\n{_fmt_list(src_lines, 4)}"

    # Tồn kho
    if isinstance(data, dict) and {"sku","product_name","total_available","total_allocated","total_on_hand"}.issubset(data.keys()):
        lines = []
        details = data.get("details") or []
        for d in details[:5]:
            lines.append(
                f"- {d.get('warehouse_code')} ({d.get('warehouse_name')}), bin {_s(d.get('bin_code'))}: "
                f"khả dụng {d.get('available')} (tồn {d.get('on_hand')}, giữ {d.get('allocated')})"
            )
        extra = ("\nChi tiết:\n" + "\n".join(lines)) if lines else ""
        return (
            f"Tồn kho SKU {data['sku']} ({data['product_name']}): "
            f"khả dụng {data['total_available']}, đang giữ {data['total_allocated']}, tồn {data['total_on_hand']}."
            f"{extra}"
        )

    # PO/PR/GR/GI status
    if isinstance(data, dict) and "po_code" in data and "status" in data:
        return (
            f"Đơn mua {data['po_code']} trạng thái: {data['status']}. "
            f"NCC: {_s(data.get('supplier_name') or data.get('supplier_code'))}. "
            f"Ngày đặt: {_s(data.get('order_date'))}. Dự kiến giao: {_s(data.get('expected_delivery_date'))}."
        )
    if isinstance(data, dict) and "pr_code" in data and "status" in data:
        return f"PR {data['pr_code']} trạng thái: {data['status']}. Ngày yêu cầu: {_s(data.get('request_date'))}."
    if isinstance(data, dict) and "gr_code" in data and "status" in data:
        return f"GR {data['gr_code']} trạng thái: {data['status']}. Ngày nhập: {_s(data.get('receipt_date'))}."
    if isinstance(data, dict) and "gi_code" in data and "status" in data:
        return f"GI {data['gi_code']} trạng thái: {data['status']}. Ngày xuất: {_s(data.get('issue_date'))}."

    # List
    if isinstance(data, list) and data and all(isinstance(x, dict) for x in data):
        keys = set().union(*[set(x.keys()) for x in data[:5]])
        if "po_code" in keys and "status" in keys:
            lines = [f"- {x.get('po_code')}: {x.get('status')} | ETD {_s(x.get('expected_delivery_date'))}" for x in data[:10]]
            return "Danh sách PO:\n" + _fmt_list(lines, 10)
        if "transaction_type" in keys and "quantity_change" in keys and "reference_code" in keys:
            lines = [f"- {_s(x.get('transaction_date'))} | {x.get('transaction_type')} | {x.get('sku')} | Δ {x.get('quantity_change')} | ref {x.get('reference_code')}" for x in data[:12]]
            return "Log biến động tồn kho:\n" + _fmt_list(lines, 12)

    return None

def _is_bad_answer(answer: str) -> bool:
    if not answer: return True
    if "..." in answer: return True
    if "{{" in answer or "}}" in answer: return True
    if "{s" in answer: return True
    return False

def execute_chat(module: str, user_id: int | None, role: str | None, message: str, paraphrase_enabled: bool = True):
    if not check_role(module, role):
        raise PermissionDenied(f"Role '{role}' không được phép dùng chatbot module '{module}'.")

    auth = {"user_id": user_id, "role": role, "is_authenticated": True}
    plan = plan_route(module=module, message=message, auth=auth)
    audit({"event": "plan_created", "module": module, "plan": plan.model_dump()})

    if plan.needs_clarification:
        return {"answer": plan.clarifying_question, "plan": plan.model_dump()}

    validate_plan(plan)

    store: Dict[str, Any] = {}
    for idx, step in enumerate(plan.steps, start=1):
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
        store[f"s{idx}"] = result  # alias chuẩn
        if step.save_as:
            store[step.save_as] = result

    answer = None
    if plan.final_response_template:
        answer = _render_template(plan.final_response_template, store)

    # Deterministic answer từ data thật
    if _is_bad_answer(answer or ""):
        s1 = store.get("s1")
        if isinstance(s1, dict):
            data = s1.get("data")
            fb = _fallback_from_data(data)
            if fb:
                answer = fb

    answer = answer or "Đã tra cứu xong."

    # ===== Layer B: LLM paraphrase có guardrail =====
    facts_for_paraphrase = store.get("s1") if isinstance(store.get("s1"), dict) else {"data": store.get("s1")}
    answer_final = paraphrase_answer(answer, facts=facts_for_paraphrase or {}, enabled=paraphrase_enabled)

    return {"answer": answer_final, "data": store, "plan": plan.model_dump()}
'''.lstrip())

    # (C) Patch chat endpoint: thêm paraphrase flag
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
    debug: bool = False
    paraphrase: bool = True  # NEW

@router.post("/chat")
def chat(req: ChatRequest):
    result = execute_chat(
        module=req.module,
        user_id=req.user_id,
        role=req.role,
        message=req.message,
        paraphrase_enabled=req.paraphrase
    )

    if not req.debug:
        out = {"answer": result.get("answer")}
        if "candidates" in result:
            out["candidates"] = result["candidates"]
        return JSONResponse(content=out, media_type="application/json; charset=utf-8")

    return JSONResponse(content=result, media_type="application/json; charset=utf-8")
'''.lstrip())

    print("DONE. Restart uvicorn. (ENABLE_PARAPHRASE=true mặc định)")
    print("Bạn có thể tắt nhanh bằng request paraphrase=false hoặc env ENABLE_PARAPHRASE=false.")

if __name__ == "__main__":
    main()
