from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok
from app.modules.sale_crm.models import Order, OrderDetail, Payment, ProductVariant, User
from app.modules.sale_crm.tools.helpers import to_float, calc_order_total

class OrderIdArgs(BaseModel):
    order_id: int = Field(..., ge=1)
    target_user_id: Optional[int] = Field(default=None, ge=1)

class TimDonHangArgs(BaseModel):
    target_user_id: Optional[int] = Field(default=None, ge=1)
    order_status: Optional[str] = None
    from_date: Optional[datetime] = None
    to_date: Optional[datetime] = None
    min_total: Optional[float] = Field(default=None, ge=0)
    max_total: Optional[float] = Field(default=None, ge=0)
    limit: int = Field(default=20, ge=1, le=200)

class DonHangMaxArgs(BaseModel):
    target_user_id: Optional[int] = Field(default=None, ge=1)
    from_date: Optional[datetime] = None
    to_date: Optional[datetime] = None

class EmptyArgs(BaseModel):
    pass

class ChuDonHangArgs(BaseModel):
    order_id: int = Field(..., ge=1)
    target_user_id: Optional[int] = Field(default=None, ge=1)

def chu_don_hang(session: Session, order_id: int, target_user_id: Optional[int] = None) -> Dict[str, Any]:
    q = session.query(Order, User).join(User, Order.user_id == User.id).filter(Order.id == order_id)
    if target_user_id is not None:
        q = q.filter(Order.user_id == target_user_id)

    row = q.first()
    if not row:
        return ok(None, f"Không tìm thấy đơn hàng {order_id}.")
    o, u = row
    return ok({
        "order_id": o.id,
        "user_id": u.id,
        "username": u.username,
        "phone": u.phone,
        "email": u.email,
    })

def tra_cuu_trang_thai_don_hang(session: Session, order_id: int, target_user_id: Optional[int] = None) -> Dict[str, Any]:
    q = session.query(Order, Payment).outerjoin(Payment, Order.payment_id == Payment.id).filter(Order.id == order_id)
    if target_user_id is not None:
        q = q.filter(Order.user_id == target_user_id)
    row = q.first()
    if not row:
        return ok(None, f"Không tìm thấy đơn hàng {order_id}.")
    o, p = row
    return ok({
        "order_id": o.id,
        "user_id": o.user_id,
        "order_status": o.order_status,
        "created_at": o.created_at,
        "payment": None if not p else {
            "payment_id": p.id,
            "payment_status": p.payment_status,
            "payment_method": p.payment_method,
            "amount": to_float(p.amount),
            "transaction_id": p.transaction_id,
        }
    })

def chi_tiet_don_hang(session: Session, order_id: int, target_user_id: Optional[int] = None) -> Dict[str, Any]:
    oq = session.query(Order).filter(Order.id == order_id)
    if target_user_id is not None:
        oq = oq.filter(Order.user_id == target_user_id)
    o = oq.first()
    if not o:
        return ok(None, f"Không tìm thấy đơn hàng {order_id}.")
    rows = (
        session.query(
            OrderDetail.id,
            OrderDetail.product_variant_id,
            ProductVariant.name,
            OrderDetail.quantity,
            OrderDetail.price,
        )
        .join(ProductVariant, OrderDetail.product_variant_id == ProductVariant.id)
        .filter(OrderDetail.order_id == order_id)
        .all()
    )
    items = []
    for rid, variant_id, vname, qty, price in rows:
        line_total = float(qty or 0) * float(price or 0)
        items.append({
            "order_detail_id": rid,
            "product_variant_id": variant_id,
            "variant_name": vname,
            "quantity": qty,
            "unit_price": float(price or 0),
            "line_total": line_total,
        })
    total = calc_order_total(session, order_id)
    return ok({
        "order_id": order_id,
        "user_id": o.user_id,
        "order_status": o.order_status,
        "created_at": o.created_at,
        "items": items,
        "total_amount": total,
    })

def don_hang_gan_nhat(session: Session, target_user_id: Optional[int] = None) -> Dict[str, Any]:
    q = session.query(Order).order_by(Order.created_at.desc())
    if target_user_id is not None:
        q = q.filter(Order.user_id == target_user_id)
    o = q.first()
    if not o:
        return ok(None, "Không có đơn hàng.")
    total = calc_order_total(session, o.id)
    return ok({
        "order_id": o.id,
        "user_id": o.user_id,
        "order_status": o.order_status,
        "created_at": o.created_at,
        "total_amount": total,
    })

def tim_don_hang(
    session: Session,
    target_user_id: Optional[int] = None,
    order_status: Optional[str] = None,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    min_total: Optional[float] = None,
    max_total: Optional[float] = None,
    limit: int = 20,
) -> Dict[str, Any]:
    total_expr = func.sum(OrderDetail.quantity * OrderDetail.price).label("total_amount")
    q = (
        session.query(Order.id, Order.user_id, Order.created_at, Order.order_status, total_expr)
        .join(OrderDetail, Order.id == OrderDetail.order_id)
        .group_by(Order.id)
        .order_by(Order.created_at.desc())
    )
    if target_user_id is not None:
        q = q.filter(Order.user_id == target_user_id)
    if order_status:
        q = q.filter(Order.order_status == order_status)
    if from_date:
        q = q.filter(Order.created_at >= from_date)
    if to_date:
        q = q.filter(Order.created_at <= to_date)
    if min_total is not None:
        q = q.having(total_expr >= min_total)
    if max_total is not None:
        q = q.having(total_expr <= max_total)

    rows = q.limit(limit).all()
    return ok([{
        "order_id": oid,
        "user_id": uid,
        "created_at": created_at,
        "order_status": status,
        "total_amount": float(total or 0),
    } for oid, uid, created_at, status, total in rows])

def don_hang_gia_tri_cao_nhat(
    session: Session,
    target_user_id: Optional[int] = None,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
) -> Dict[str, Any]:
    total_expr = func.sum(OrderDetail.quantity * OrderDetail.price).label("total_amount")
    q = (
        session.query(Order.id, Order.user_id, Order.created_at, Order.order_status, total_expr)
        .join(OrderDetail, Order.id == OrderDetail.order_id)
        .group_by(Order.id)
        .order_by(total_expr.desc())
    )
    if target_user_id is not None:
        q = q.filter(Order.user_id == target_user_id)
    if from_date:
        q = q.filter(Order.created_at >= from_date)
    if to_date:
        q = q.filter(Order.created_at <= to_date)

    row = q.first()
    if not row:
        return ok(None, "Không có dữ liệu.")
    oid, uid, created_at, status, total = row
    return ok({
        "order_id": oid,
        "user_id": uid,
        "created_at": created_at,
        "order_status": status,
        "total_amount": float(total or 0),
    })

ORDER_TOOLS: List[ToolSpec] = [
    ToolSpec("tra_cuu_trang_thai_don_hang", "Tra cứu trạng thái đơn hàng + trạng thái thanh toán.", OrderIdArgs, tra_cuu_trang_thai_don_hang, "sale_crm"),
    ToolSpec("chi_tiet_don_hang", "Xem chi tiết đơn hàng (items + tổng tiền).", OrderIdArgs, chi_tiet_don_hang, "sale_crm"),
    ToolSpec("don_hang_gan_nhat", "Lấy đơn hàng gần nhất của khách hàng.", EmptyArgs, don_hang_gan_nhat, "sale_crm"),  # placeholder, được override ở __init__
    ToolSpec("tim_don_hang", "Tìm đơn theo bộ lọc (status, thời gian, tổng tiền).", TimDonHangArgs, tim_don_hang, "sale_crm"),
    ToolSpec("don_hang_gia_tri_cao_nhat", "Đơn hàng có giá trị cao nhất theo bộ lọc.", DonHangMaxArgs, don_hang_gia_tri_cao_nhat, "sale_crm"),
    ToolSpec("chu_don_hang", "Tra cứu đơn hàng thuộc về khách hàng nào.", ChuDonHangArgs, chu_don_hang, "sale_crm")
]
