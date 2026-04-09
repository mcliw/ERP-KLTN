from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.modules.supply_chain.models import Product, Warehouse, Supplier


def as_int(v) -> int:
    """Safe int conversion for tool outputs."""
    if v is None:
        return 0
    try:
        return int(v)
    except Exception:
        try:
            return int(float(v))
        except Exception:
            return 0


def like_kw(s: str) -> str:
    s = (s or "").strip()
    return f"%{s}%" if s else "%"


def norm_code(code: str) -> str:
    return (code or "").strip().upper()


def dt_iso(dt) -> Optional[str]:
    if dt is None:
        return None
    if isinstance(dt, datetime):
        return dt.isoformat()
    try:
        return str(dt)
    except Exception:
        return None


def find_product(session: Session, keyword: str) -> Optional[Product]:
    kw = (keyword or "").strip()
    if not kw:
        return None

    code = kw.upper()
    p = session.query(Product).filter(func.upper(Product.sku) == code).first()
    if p:
        return p

    return (
        session.query(Product)
        .filter(or_(Product.sku.ilike(like_kw(kw)), Product.product_name.ilike(like_kw(kw))))
        .order_by(Product.product_name.asc())
        .first()
    )


def find_warehouse(session: Session, keyword: str) -> Optional[Warehouse]:
    kw = (keyword or "").strip()
    if not kw:
        return None

    code = kw.upper()
    w = session.query(Warehouse).filter(func.upper(Warehouse.warehouse_code) == code).first()
    if w:
        return w

    return (
        session.query(Warehouse)
        .filter(or_(Warehouse.warehouse_code.ilike(like_kw(kw)), Warehouse.warehouse_name.ilike(like_kw(kw))))
        .order_by(Warehouse.warehouse_name.asc())
        .first()
    )


def find_supplier(session: Session, keyword: str) -> Optional[Supplier]:
    kw = (keyword or "").strip()
    if not kw:
        return None

    code = kw.upper()
    s = session.query(Supplier).filter(func.upper(Supplier.supplier_code) == code).first()
    if s:
        return s

    return (
        session.query(Supplier)
        .filter(or_(Supplier.supplier_code.ilike(like_kw(kw)), Supplier.supplier_name.ilike(like_kw(kw))))
        .order_by(Supplier.supplier_name.asc())
        .first()
    )
