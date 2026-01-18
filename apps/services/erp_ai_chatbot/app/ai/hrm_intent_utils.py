# app/ai/hrm_intent_utils.py
import re

_EMP_CODE_RE = re.compile(r"\b([A-Z]{2,10}\d{2,6})\b")

_SELF_KW_RE = re.compile(
    r"\b(tôi|toi|tui|mình|minh|của tôi|cua toi|bản thân|ban than|me|my|i)\b",
    re.IGNORECASE,
)

def extract_employee_code(text: str) -> str | None:
    m = _EMP_CODE_RE.search((text or "").strip())
    return m.group(1).upper() if m else None

def is_self_query(text: str) -> bool:
    return bool(_SELF_KW_RE.search((text or "").strip()))
