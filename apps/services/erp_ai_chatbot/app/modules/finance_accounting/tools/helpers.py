from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Any, Optional, Type

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.ai.tooling import can_lam_ro


def norm_text(x: Any) -> Optional[str]:
    if x is None:
        return None
    s = str(x).strip()
    return s if s else None


def norm_code(x: Any) -> Optional[str]:
    s = norm_text(x)
    if not s:
        return None
    u = s.upper()
    # Map một số alias thường gặp để khớp ENUM trong schema
    alias = {
        'PURCHASE': 'PURCHASING',
        'PURCHASES': 'PURCHASING',
        'PO': 'PURCHASING',
        'CASH': 'TREASURY',
        'BANK': 'TREASURY',
    }
    return alias.get(u, u)


def iso_date(d: Optional[date]) -> Optional[str]:
    return d.isoformat() if d else None


def to_str(x: Any) -> Optional[str]:
    if x is None:
        return None
    if isinstance(x, Decimal):
        return format(x, 'f')
    return str(x)


def fmt_money(x: Any) -> str:
    if x is None:
        return '0'
    try:
        v = float(x)
    except Exception:
        return str(x)
    return f"{v:,.0f}"


def safe_limit(limit: int, default: int = 20, max_limit: int = 200) -> int:
    try:
        n = int(limit)
    except Exception:
        return default
    return max(1, min(n, max_limit))


def candidates_by_prefix(session: Session, model: Type[Any], field: str, prefix: str, limit: int = 10) -> list[str]:
    pref = (prefix or '').strip()
    if not pref:
        return []
    col = getattr(model, field)
    rows = (
        session.query(col)
        .filter(func.upper(col).like(func.upper(pref) + '%'))
        .order_by(col.asc())
        .limit(safe_limit(limit, default=10, max_limit=50))
        .all()
    )
    out = []
    for (v,) in rows:
        if v is not None:
            out.append(str(v))
    return out


def require_any(**kwargs):
    for v in kwargs.values():
        if v is None:
            continue
        if isinstance(v, str) and not v.strip():
            continue
        return None
    keys = ', '.join(kwargs.keys())
    return can_lam_ro(f'Bạn cần cung cấp ít nhất một tham số trong: {keys}.', [])


def today() -> date:
    return date.today()


def iso(d: Optional[date]) -> Optional[str]:
    return iso_date(d)
