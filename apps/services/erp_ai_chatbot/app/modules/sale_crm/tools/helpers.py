from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Optional, Tuple

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.modules.sale_crm.models import (
    Order, OrderDetail, ProductVariant, VoucherDetail, VoucherConstraint, Voucher, Review
)

def to_float(x: Any) -> Optional[float]:
    if x is None:
        return None
    if isinstance(x, Decimal):
        return float(x)
    try:
        return float(x)
    except Exception:
        return None

def calc_variant_final_price(original_price: Any, discount_amount: Any, discount_percent: Any) -> float:
    op = to_float(original_price) or 0.0
    da = to_float(discount_amount) or 0.0
    dp = to_float(discount_percent) or 0.0
    if da > 0:
        return max(0.0, op - da)
    if dp > 0:
        return max(0.0, op * (1.0 - dp / 100.0))
    return op

def calc_order_total(session: Session, order_id: int) -> float:
    total = (
        session.query(func.sum(OrderDetail.quantity * OrderDetail.price))
        .filter(OrderDetail.order_id == order_id)
        .scalar()
    )
    return float(total or 0)

def voucher_compute_discount(
    discount_type: str,
    discount_value: Any,
    order_amount: float,
    max_discount_amount: Any = None,
) -> Tuple[float, float]:
    dv = to_float(discount_value) or 0.0
    dt = (discount_type or "").upper()
    if dt in {"PERCENT", "PERCENTAGE"}:
        discount = order_amount * dv / 100.0
    elif dt == "SHIPPING":
        # Không có bảng shipping fee riêng trong schema; coi như giảm trực tiếp 1 số tiền.
        discount = dv
    else:
        discount = dv

    max_cap = to_float(max_discount_amount)
    if max_cap is not None:
        discount = min(discount, max_cap)

    discount = min(discount, order_amount)
    payable = max(0.0, order_amount - discount)
    return discount, payable

def is_new_customer(session: Session, user_id: int) -> bool:
    exists = session.query(Order.id).filter(Order.user_id == user_id).first()
    return exists is None

def find_voucher_bundle(session: Session, code: str):
    vd = (
        session.query(VoucherDetail)
        .filter(VoucherDetail.code == code, VoucherDetail.is_active == True)
        .first()
    )
    if not vd:
        return None, None, None

    v = vd.voucher
    vc = (
        session.query(VoucherConstraint)
        .filter(VoucherConstraint.voucher_id == v.id)
        .first()
    )
    return vd, v, vc

def now_utc() -> datetime:
    return datetime.utcnow()
