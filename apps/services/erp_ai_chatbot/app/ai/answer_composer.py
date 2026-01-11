from __future__ import annotations

import json
import os
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from google import genai

load_dotenv()

_GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
_GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
_client = genai.Client(api_key=_GEMINI_API_KEY) if _GEMINI_API_KEY else genai.Client()


def _preview(obj: Any, list_n: int = 6, nested_n: int = 6) -> Any:
    """Giảm payload để tránh LLM bị ngợp + tránh gửi quá dài."""
    if isinstance(obj, list):
        return obj[:max(1, min(list_n, 20))]
    if isinstance(obj, dict):
        out: Dict[str, Any] = {}
        # ưu tiên scalar
        for k, v in obj.items():
            if isinstance(v, (str, int, float, bool)) or v is None:
                out[k] = v
            if len(out) >= 10:
                break
        # preview nested list phổ biến
        for k in ["items", "rows", "details", "logs", "sources", "gr_list"]:
            if isinstance(obj.get(k), list):
                out[k] = obj[k][:max(1, min(nested_n, 20))]
        return out
    return obj


def compose_answer_with_llm(module: str, question: str, step_infos: List[Dict[str, Any]]) -> str:
    payload = {
        "module": module,
        "question": question,
        "tool_results": [
            {
                "step_id": si.get("id"),
                "tool": si.get("tool"),
                "args": si.get("args"),
                "data_preview": _preview((si.get("result") or {}).get("data")),
                "message": (si.get("result") or {}).get("thong_diep"),
                "ok": (si.get("result") or {}).get("ok"),
            }
            for si in step_infos
        ],
    }

    sys = (
        "Bạn là trợ lý ERP.\n"
        "Hãy trả lời NGẮN GỌN, đúng trọng tâm theo câu hỏi.\n"
        "- Chỉ dùng dữ liệu trong tool_results.\n"
        "- Nếu câu hỏi chỉ yêu cầu 2-3 trường, chỉ trả đúng các trường đó.\n"
        "- Không kể thông tin thừa.\n"
        "- Nếu không có dữ liệu phù hợp, nói rõ 'không có dữ liệu' và dừng.\n"
    )

    resp = _client.models.generate_content(
        model=_GEMINI_MODEL,
        contents=json.dumps(payload, ensure_ascii=False),
        config={"system_instruction": sys, "temperature": 0.2},
    )
    return (resp.text or "").strip()


def compose_safe_enough(answer: str) -> bool:
    if not answer:
        return False
    bad_markers = ["{{", "}}", "{s", "..."]
    return not any(x in answer for x in bad_markers)
