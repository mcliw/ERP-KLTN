from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok
from app.modules.sale_crm.models import Order, Payment
from app.modules.sale_crm.tools.helpers import to_float

class PaymentByOrderArgs(BaseModel):
    order_id: int = Field(..., ge=1)
    target_user_id: Optional[int] = Field(default=None, ge=1)

class TimGiaoDichLoiArgs(BaseModel):
    from_date: Optional[datetime] = None
    to_date: Optional[datetime] = None
    limit: int = Field(default=50, ge=1, le=500)

def trang_thai_thanh_toan_theo_don(session: Session, order_id: int, target_user_id: Optional[int] = None) -> Dict[str, Any]:
    q = session.query(Order, Payment).outerjoin(Payment, Order.payment_id == Payment.id).filter(Order.id == order_id)
    if target_user_id is not None:
        q = q.filter(Order.user_id == target_user_id)
    row = q.first()
    if not row:
        return ok(None, f"Không tìm thấy đơn hàng {order_id}.")
    o, p = row
    if not p:
        return ok({
            "order_id": o.id,
            "user_id": o.user_id,
            "payment": None,
            "message": "Đơn hàng chưa có bản ghi thanh toán.",
        })
    return ok({
        "order_id": o.id,
        "user_id": o.user_id,
        "payment": {
            "payment_id": p.id,
            "payment_status": p.payment_status,
            "payment_method": p.payment_method,
            "amount": to_float(p.amount),
            "transaction_id": p.transaction_id,
            "created_at": p.created_at,
            "updated_at": p.updated_at,
        }
    })

def tim_giao_dich_loi(session: Session, from_date: Optional[datetime] = None, to_date: Optional[datetime] = None, limit: int = 50) -> Dict[str, Any]:
    bad_status = {"FAILED", "ERROR", "PENDING"}
    q = session.query(Payment).filter(Payment.payment_status.in_(list(bad_status))).order_by(Payment.created_at.desc())
    if from_date:
        q = q.filter(Payment.created_at >= from_date)
    if to_date:
        q = q.filter(Payment.created_at <= to_date)
    rows = q.limit(limit).all()
    return ok([{
        "payment_id": p.id,
        "payment_status": p.payment_status,
        "payment_method": p.payment_method,
        "amount": to_float(p.amount),
        "transaction_id": p.transaction_id,
        "created_at": p.created_at,
    } for p in rows])

PAYMENT_TOOLS: List[ToolSpec] = [
    ToolSpec("trang_thai_thanh_toan_theo_don", "Tra cứu thanh toán theo order_id (an toàn hơn payment_id).", PaymentByOrderArgs, trang_thai_thanh_toan_theo_don, "sale_crm"),
    ToolSpec("tim_giao_dich_loi", "Liệt kê giao dịch FAILED/ERROR/PENDING theo thời gian.", TimGiaoDichLoiArgs, tim_giao_dich_loi, "sale_crm"),
]
