from __future__ import annotations

import json
import os
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from google import genai

load_dotenv()

_GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
_GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

# ✅ Không tạo client nếu thiếu key (tránh crash import)
_client = genai.Client(api_key=_GEMINI_API_KEY) if _GEMINI_API_KEY else None


def _preview(obj: Any, list_n: int = 6, nested_n: int = 6) -> Any:
    """Giảm payload để tránh LLM bị ngợp + tránh gửi quá dài.
       Giữ nested dict quan trọng (payment/voucher/customer/...) để LLM không trả sai 'không có dữ liệu'.
    """
    if isinstance(obj, list):
        return [_preview(x, list_n=list_n, nested_n=nested_n) for x in obj[:max(1, min(list_n, 20))]]

    if isinstance(obj, dict):
        out: Dict[str, Any] = {}

        # ưu tiên scalar ở level hiện tại
        scalar_added = 0
        for k, v in obj.items():
            if isinstance(v, (str, int, float, bool)) or v is None:
                out[k] = v
                scalar_added += 1
            if scalar_added >= 12:
                break

        for k in [
            "payment", "voucher", "constraint", "constraints",
            "customer", "user", "address",
            "product", "variant", "brand",
            "order", "summary", "stats",
            "top_brand",         
        ]:
            if isinstance(obj.get(k), dict):
                out[k] = _preview(obj[k], list_n=list_n, nested_n=nested_n)

        # preview nested list phổ biến
        for k in [
            "items", "rows", "details", "logs", "sources", "gr_list",
            "variants", "reviews", "orders", "images",
            "ranking",         
        ]:
            if isinstance(obj.get(k), list):
                out[k] = _preview(obj[k], list_n=nested_n, nested_n=nested_n)

        # ✅ fallback: giữ thêm 1-2 nested dict/list bất kỳ nếu out đang quá nghèo
        if len(out) <= 2:
            for k, v in obj.items():
                if k in out:
                    continue
                if isinstance(v, dict):
                    out[k] = _preview(v, list_n=list_n, nested_n=nested_n)
                    break
            for k, v in obj.items():
                if k in out:
                    continue
                if isinstance(v, list):
                    out[k] = _preview(v, list_n=nested_n, nested_n=nested_n)
                    break

        return out

    return obj


def compose_answer_with_llm(module: str, question: str, step_infos: List[Dict[str, Any]]) -> str:
    # ✅ nếu không có key thì không compose, để executor fallback deterministic
    if _client is None:
        return ""

    payload = {
        "module": module,
        "question": question,
        "tool_results": [
            {
                "step_id": si.get("id"),
                "tool": si.get("tool"),
                "args": _preview(si.get("args")),
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
        "- Nếu dữ liệu có 'top_' hoặc 'ranking' (báo cáo/top), hãy trả thêm 1 dòng tóm tắt gồm: "
        " tổng số lượng (total_qty) và tổng tiền (total_amount) nếu có.\n"
        "- Không kể thông tin thừa. Kể cả có dữ liệu cung cấp. Chỉ trả lời đúng trọng tâm câu hỏi.\n"
        "- Nếu không có dữ liệu phù hợp, nói rõ 'không có dữ liệu' và dừng.\n"
        "- Luôn kiểm tra tính nhất quán của dữ liệu, nếu có mâu thuẫn, hãy nói rõ.\n"
        "- Trả lời bằng tiếng Việt."
    )

    resp = _client.models.generate_content(
        model=_GEMINI_MODEL,
        contents=json.dumps(payload, ensure_ascii=False, default=str), 
        config={"system_instruction": sys, "temperature": 0.7},
    )
    return (resp.text or "").strip()


def compose_safe_enough(answer: str) -> bool:
    if not answer:
        return False
    bad_markers = ["{{", "}}", "{s", "..."]
    return not any(x in answer for x in bad_markers)
