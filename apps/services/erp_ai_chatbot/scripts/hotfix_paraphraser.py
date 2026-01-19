from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def write(rel_path: str, content: str):
    p = ROOT / rel_path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    print(f"[WRITE] {rel_path}")

def main():
    write("app/ai/paraphraser.py", r'''
from __future__ import annotations

import json
import os
import re
from typing import Any, Dict

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

def _collect_expected_codes_from_facts(obj: Any) -> set[str]:
    """
    Thu thập các mã chứng từ xuất hiện trong FACTS_JSON (PO/PR/GR/GI/REF...).
    Mục tiêu: bắt paraphrase không được rút gọn mất các mã này.
    """
    codes: set[str] = set()
    if obj is None:
        return codes
    if isinstance(obj, str):
        return _extract_codes(obj)
    if isinstance(obj, dict):
        for k, v in obj.items():
            if isinstance(v, str) and (k.endswith("_code") or k in {"po_code","pr_code","gr_code","gi_code","reference_code"}):
                codes |= _extract_codes(v)
            codes |= _collect_expected_codes_from_facts(v)
        return codes
    if isinstance(obj, list):
        for it in obj[:30]:
            codes |= _collect_expected_codes_from_facts(it)
        return codes
    return codes

def _safe_enough(paraphrased: str, allowed: str, expected_codes: set[str] | None = None) -> bool:
    expected_codes = expected_codes or set()

    # 1) độ dài
    if not paraphrased or len(paraphrased) > 800:
        return False

    # 2) không tạo số mới
    pn = _extract_numbers(paraphrased)
    an = _extract_numbers(allowed)
    if not pn.issubset(an):
        return False

    # 3) không tạo mã mới
    pc = _extract_codes(paraphrased)
    ac = _extract_codes(allowed)
    if not pc.issubset(ac):
        return False

    # 4) không dùng "..."
    if "..." in paraphrased:
        return False

    # 5) nếu facts có mã chứng từ (preview list), paraphrase phải giữ ít nhất các mã đó (giới hạn 6)
    if expected_codes:
        need = set(list(expected_codes)[:6])
        if not need.issubset(_extract_codes(paraphrased)):
            return False

    return True

def paraphrase_answer(deterministic_answer: str, facts: Dict[str, Any], enabled: bool = True) -> str:
    if not _ENABLE or not enabled:
        return deterministic_answer

    if not deterministic_answer or len(deterministic_answer) < 12:
        return deterministic_answer

    allowed = _allowed_text(deterministic_answer, facts)
    expected_codes = _collect_expected_codes_from_facts(facts)

    sys = (
        "Bạn là lớp Paraphrase cho chatbot ERP.\n"
        "NHIỆM VỤ: viết lại câu trả lời cho tự nhiên, ngắn gọn, tiếng Việt.\n"
        "RÀNG BUỘC BẮT BUỘC:\n"
        "1) CHỈ dùng thông tin có trong FACTS_JSON và ANSWER_GOC.\n"
        "2) KHÔNG thêm số liệu, mã chứng từ, trạng thái, ngày tháng, tên sản phẩm mới.\n"
        "3) Nếu FACTS_JSON có items_preview thì phải nêu rõ mã chứng từ của các dòng preview và kèm trạng thái/ngày nếu có.\n"
        "4) Không dùng dấu '...'.\n"
        "Nếu không chắc, trả lại nguyên văn ANSWER_GOC.\n"
        "Trả về đúng 1 đoạn text, không markdown.\n"
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
                "temperature": 0,
                "response_mime_type": "text/plain",
            },
        )
        out = (resp.text or "").strip()
        if not out:
            return deterministic_answer

        if not _safe_enough(out, allowed, expected_codes):
            return deterministic_answer

        return out
    except Exception:
        return deterministic_answer
'''.lstrip())

    print("DONE: hotfix paraphraser.py. Restart uvicorn.")

if __name__ == "__main__":
    main()
