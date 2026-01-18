from __future__ import annotations

from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

import re
import unicodedata

def require_any(args, fields: list[str], message: str | None = None) -> None:
    """
    Bắt buộc args phải có ít nhất 1 field trong `fields` khác rỗng.
    Dùng cho các tool search: cần (code) hoặc (name) hoặc (query)...
    """
    for f in fields:
        v = getattr(args, f, None)
        if v is None:
            continue
        if isinstance(v, str) and v.strip() == "":
            continue
        # số/boolean/list/dict... chỉ cần not None
        return
    raise ValueError(message or f"Thiếu tham số: cần ít nhất một trong {', '.join(fields)}.")

def norm_text(s: str | None) -> str:
    """Chuẩn hoá text để search: strip, collapse spaces, lowercase."""
    if s is None:
        return ""
    s = str(s).strip()
    s = unicodedata.normalize("NFC", s)
    s = re.sub(r"\s+", " ", s)
    return s

def norm(s: Optional[str]) -> str:
    return (s or "").strip()


def norm_code(s: Optional[str]) -> str:
    return norm(s).upper()

def today() -> date:
    return date.today()

def iso_date(d: Any) -> str | None:
    """Chuyển date/datetime/string sang ISO 'YYYY-MM-DD'. Trả None nếu không parse được."""
    if d is None:
        return None
    if isinstance(d, (date, datetime)):
        return d.date().isoformat() if isinstance(d, datetime) else d.isoformat()
    s = str(d).strip()
    if not s:
        return None
    # Accept 'YYYY-MM-DD' hoặc 'DD/MM/YYYY'
    try:
        if "-" in s and len(s) >= 10:
            return s[:10]
        if "/" in s:
            dd, mm, yy = s.split("/")[:3]
            return date(int(yy), int(mm), int(dd)).isoformat()
    except Exception:
        return None
    return None

def iso(d: Any) -> str | None:
    """Chuyển date/datetime/string sang ISO 'YYYY-MM-DD'. Trả None nếu không parse được."""
    if d is None:
        return None
    if isinstance(d, (date, datetime)):
        return d.date().isoformat() if isinstance(d, datetime) else d.isoformat()
    s = str(d).strip()
    if not s:
        return None
    # Accept 'YYYY-MM-DD' hoặc 'DD/MM/YYYY'
    try:
        if "-" in s and len(s) >= 10:
            return s[:10]
        if "/" in s:
            dd, mm, yy = s.split("/")[:3]
            return date(int(yy), int(mm), int(dd)).isoformat()
    except Exception:
        return None
    return None


def safe_limit(x: Any, default: int = 10, max_limit: int = 50) -> int:
    """Giới hạn limit để tránh trả data quá dài."""
    try:
        n = int(x)
    except Exception:
        n = default
    if n <= 0:
        n = default
    if n > max_limit:
        n = max_limit
    return n

def to_str(x: Any) -> str:
    return "" if x is None else str(x)

def fmt_money(x: Any) -> str:
    """Format số tiền kiểu 1,234,567 (string)."""
    try:
        v = float(x)
    except Exception:
        return to_str(x)
    if v.is_integer():
        return f"{int(v):,}"
    return f"{v:,.2f}"


def safe_days(days: int, default: int = 7, max_days: int = 365) -> int:
    try:
        v = int(days)
    except Exception:
        return default
    if v <= 0:
        return default
    return min(v, max_days)


def since_days(days: int) -> datetime:
    return datetime.utcnow() - timedelta(days=days)


def candidates_by_prefix(
    session: Session,
    model_cls,
    field_name: str,
    prefix: str,
    limit: int = 5,
) -> list[str]:
    p = norm_code(prefix)
    if not p:
        return []
    col = getattr(model_cls, field_name)
    rows = (
        session.query(col)
        .filter(func.upper(col).like(p + "%"))
        .order_by(col.asc())
        .limit(limit)
        .all()
    )
    return [r[0] for r in rows]
