from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok
from app.modules.sale_crm.models import Order, OrderDetail, ProductVariant, Product, Brand

class LichSuMuaArgs(BaseModel):
    target_user_id: Optional[int] = Field(default=None, ge=1)
    limit: int = Field(default=20, ge=1, le=200)

class TongTienMuaArgs(BaseModel):
    target_user_id: Optional[int] = Field(default=None, ge=1)
    from_date: Optional[datetime] = None
    to_date: Optional[datetime] = None

class ThongKeHangArgs(BaseModel):
    target_user_id: Optional[int] = Field(default=None, ge=1)
    limit: int = Field(default=10, ge=1, le=100)

def lich_su_mua_hang(session: Session, target_user_id: Optional[int] = None, limit: int = 20) -> Dict[str, Any]:
    total_expr = func.sum(OrderDetail.quantity * OrderDetail.price).label("total_amount")
    q = (
        session.query(Order.id, Order.user_id, Order.created_at, Order.order_status, total_expr)
        .join(OrderDetail, Order.id == OrderDetail.order_id)
        .group_by(Order.id)
        .order_by(Order.created_at.desc())
    )
    if target_user_id is not None:
        q = q.filter(Order.user_id == target_user_id)
    rows = q.limit(limit).all()
    return ok([{
        "order_id": oid,
        "user_id": uid,
        "created_at": created_at,
        "order_status": status,
        "total_amount": float(total or 0),
    } for oid, uid, created_at, status, total in rows])

def tong_tien_mua_hang(
    session: Session,
    target_user_id: Optional[int] = None,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
) -> Dict[str, Any]:
    total_expr = func.sum(OrderDetail.quantity * OrderDetail.price)
    q = session.query(total_expr).join(Order, Order.id == OrderDetail.order_id)
    if target_user_id is not None:
        q = q.filter(Order.user_id == target_user_id)
    if from_date:
        q = q.filter(Order.created_at >= from_date)
    if to_date:
        q = q.filter(Order.created_at <= to_date)
    total = q.scalar()
    return ok({
        "target_user_id": target_user_id,
        "from_date": from_date,
        "to_date": to_date,
        "total_spent": float(total or 0),
    })

def thong_ke_mua_theo_hang(session: Session, target_user_id: Optional[int] = None, limit: int = 10) -> Dict[str, Any]:
    total_expr = func.sum(OrderDetail.quantity * OrderDetail.price).label("total_amount")
    count_orders = func.count(func.distinct(Order.id)).label("order_count")
    q = (
        session.query(Brand.id, Brand.name, count_orders, total_expr)
        .join(Product, Product.brand_id == Brand.id)
        .join(ProductVariant, ProductVariant.product_id == Product.id)
        .join(OrderDetail, OrderDetail.product_variant_id == ProductVariant.id)
        .join(Order, Order.id == OrderDetail.order_id)
        .group_by(Brand.id)
        .order_by(total_expr.desc())
    )
    if target_user_id is not None:
        q = q.filter(Order.user_id == target_user_id)
    rows = q.limit(limit).all()
    return ok([{
        "brand_id": bid,
        "brand_name": bname,
        "order_count": int(oc or 0),
        "total_amount": float(total or 0),
    } for bid, bname, oc, total in rows])

PURCHASE_TOOLS: List[ToolSpec] = [
    ToolSpec("lich_su_mua_hang", "Lịch sử mua hàng: danh sách đơn + tổng tiền từng đơn.", LichSuMuaArgs, lich_su_mua_hang, "sale_crm"),
    ToolSpec("tong_tien_mua_hang", "Tổng chi tiêu theo khoảng thời gian.", TongTienMuaArgs, tong_tien_mua_hang, "sale_crm"),
    ToolSpec("thong_ke_mua_theo_hang", "Thống kê mua theo hãng (top brand theo tổng tiền).", ThongKeHangArgs, thong_ke_mua_theo_hang, "sale_crm"),
]
