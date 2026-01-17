from __future__ import annotations
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok, can_lam_ro
from app.modules.supply_chain.models import InventoryTransactionLog, Warehouse
from .helpers import find_product, find_warehouse, dt_iso, as_int

class TruyVetBienDongArgs(BaseModel):
    tu_khoa_san_pham: str
    tu_khoa_kho: str | None = None
    limit: int = 30

def truy_vet_bien_dong_ton_kho(session: Session, tu_khoa_san_pham: str, tu_khoa_kho: str | None = None, limit: int = 30):
    p = find_product(session, tu_khoa_san_pham)
    if not p:
        return can_lam_ro("Không tìm thấy sản phẩm.", [])

    q = session.query(InventoryTransactionLog).filter(InventoryTransactionLog.product_id == p.product_id)

    if tu_khoa_kho:
        w = find_warehouse(session, tu_khoa_kho)
        if not w:
            return can_lam_ro("Không tìm thấy kho để lọc log.", [])
        q = q.filter(InventoryTransactionLog.warehouse_id == w.warehouse_id)

    logs = q.order_by(InventoryTransactionLog.transaction_date.desc()).limit(limit).all()

    data = [{
        "transaction_type": r.transaction_type,
        "quantity_change": as_int(r.quantity_change),
        "reference_code": getattr(r, "reference_code", None),
        "transaction_date": dt_iso(r.transaction_date),
        "warehouse_id": r.warehouse_id,
        "bin_id": r.bin_id,
    } for r in logs]

    return ok({"sku": p.sku, "product_name": p.product_name, "logs": data}, "Truy vết biến động tồn kho.")

BIEN_DONG_TOOLS = [
    ToolSpec("truy_vet_bien_dong_ton_kho", "Truy vết log biến động tồn kho theo SKU/tên (có thể lọc kho).", TruyVetBienDongArgs, truy_vet_bien_dong_ton_kho, "supply_chain"),
]