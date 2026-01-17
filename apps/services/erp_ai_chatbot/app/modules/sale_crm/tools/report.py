from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok
from app.modules.sale_crm.models import (
    Order, OrderDetail, ProductVariant, Product, Brand
)

class TopBrandArgs(BaseModel):
    target_user_id: int = Field(..., ge=1)
    from_date: Optional[datetime] = None
    to_date: Optional[datetime] = None
    limit: int = Field(default=10, ge=1, le=50)

def hang_mua_nhieu_nhat(
    session: Session,
    target_user_id: int,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    limit: int = 10,
) -> Dict[str, Any]:
    qty_expr = func.coalesce(func.sum(OrderDetail.quantity), 0).label("total_qty")
    amt_expr = func.coalesce(func.sum(OrderDetail.quantity * OrderDetail.price), 0).label("total_amount")

    q = (
        session.query(
            Brand.id.label("brand_id"),
            Brand.name.label("brand_name"),
            qty_expr,
            amt_expr,
        )
        .join(Product, Product.brand_id == Brand.id)
        .join(ProductVariant, ProductVariant.product_id == Product.id)
        .join(OrderDetail, OrderDetail.product_variant_id == ProductVariant.id)
        .join(Order, Order.id == OrderDetail.order_id)
        .filter(Order.user_id == target_user_id)
        .group_by(Brand.id, Brand.name)
        .order_by(qty_expr.desc(), amt_expr.desc())
    )

    if from_date:
        q = q.filter(Order.created_at >= from_date)
    if to_date:
        q = q.filter(Order.created_at <= to_date)

    rows = q.limit(limit).all()
    if not rows:
        return ok([], "Không có dữ liệu mua hàng theo hãng.")

    data = [
        {
            "brand_id": r.brand_id,
            "brand_name": r.brand_name,
            "total_qty": int(r.total_qty or 0),
            "total_amount": float(r.total_amount or 0),
        }
        for r in rows
    ]

    return ok({
        "top_brand": data[0],
        "ranking": data,
    })

REPORT_TOOLS: List[ToolSpec] = [
    ToolSpec(
        "hang_mua_nhieu_nhat",
        "Thống kê hãng (brand) được mua nhiều nhất của khách hàng theo số lượng và tổng tiền.",
        TopBrandArgs,
        hang_mua_nhieu_nhat,
        "sale_crm",
    )
]
