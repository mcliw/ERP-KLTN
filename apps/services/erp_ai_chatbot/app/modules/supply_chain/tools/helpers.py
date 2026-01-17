from __future__ import annotations
from typing import Optional
from datetime import datetime

from sqlalchemy import or_, func
from sqlalchemy.orm import Session

from app.modules.supply_chain.models import Product, Warehouse, Supplier
from typing import List, Dict, Any, Optional

def norm_code(s: str) -> str:
    return (s or "").strip().upper()

def like_kw(s: str) -> str:
    return f"%{(s or '').strip()}%"

def dt_iso(d) -> Optional[str]:
    return d.isoformat() if d else None

def as_int(x) -> int:
    try:
        return int(x or 0)
    except Exception:
        return 0

def as_str(x) -> Optional[str]:
    return None if x is None else str(x)

def find_product(session: Session, keyword: str) -> Optional[Product]:
    kw = (keyword or "").strip()
    if not kw:
        return None
    p = session.query(Product).filter(func.upper(Product.sku) == kw.upper()).first()
    if p:
        return p
    return (
        session.query(Product)
        .filter(or_(Product.product_name.ilike(like_kw(kw)), Product.sku.ilike(like_kw(kw))))
        .order_by(Product.product_id.asc())
        .first()
    )

def find_warehouse(session: Session, keyword: str) -> Optional[Warehouse]:
    kw = (keyword or "").strip()
    if not kw:
        return None
    return (
        session.query(Warehouse)
        .filter(or_(Warehouse.warehouse_code.ilike(like_kw(kw)), Warehouse.warehouse_name.ilike(like_kw(kw))))
        .order_by(Warehouse.warehouse_id.asc())
        .first()
    )

def find_supplier(session: Session, keyword: str) -> Optional[Supplier]:
    kw = (keyword or "").strip()
    if not kw:
        return None
    return (
        session.query(Supplier)
        .filter(or_(Supplier.supplier_code.ilike(like_kw(kw.upper())), Supplier.supplier_name.ilike(like_kw(kw))))
        .order_by(Supplier.supplier_id.asc())
        .first()
    )


def tim_san_pham_theo_sku_or_ten(session: Session, keyword: str, limit: int = 10) -> List[Dict[str, Any]]:
    kw = (keyword or "").strip()
    if not kw:
        return []
    q = (
        session.query(Product)
        .filter((func.upper(Product.sku) == kw.upper()) | (Product.product_name.ilike(f"%{kw}%")))
        .limit(limit)
    )
    return [
        {"product_id": p.product_id, "sku": p.sku, "product_name": p.product_name}
        for p in q.all()
    ]

def tim_kho_theo_ma_or_ten(session: Session, keyword: str, limit: int = 10) -> List[Dict[str, Any]]:
    kw = (keyword or "").strip()
    if not kw:
        return []
    q = (
        session.query(Warehouse)
        .filter((func.upper(Warehouse.warehouse_code) == kw.upper()) | (Warehouse.warehouse_name.ilike(f"%{kw}%")))
        .limit(limit)
    )
    return [
        {"warehouse_id": w.warehouse_id, "warehouse_code": w.warehouse_code, "warehouse_name": w.warehouse_name}
        for w in q.all()
    ]

def tim_ncc_theo_ma_or_ten(session: Session, keyword: str, limit: int = 10) -> List[Dict[str, Any]]:
    kw = (keyword or "").strip()
    if not kw:
        return []
    q = (
        session.query(Supplier)
        .filter((func.upper(Supplier.supplier_code) == kw.upper()) | (Supplier.supplier_name.ilike(f"%{kw}%")))
        .limit(limit)
    )
    return [
        {"supplier_id": s.supplier_id, "supplier_code": s.supplier_code, "supplier_name": s.supplier_name}
        for s in q.all()
    ]
