from __future__ import annotations
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok, can_lam_ro
from app.modules.supply_chain.models import Product, Warehouse
from .helpers import find_product, find_warehouse, as_int

class TimSanPhamArgs(BaseModel):
    tu_khoa: str = Field(..., description="SKU hoặc tên sản phẩm")

class TimKhoArgs(BaseModel):
    tu_khoa: str = Field(..., description="Mã kho hoặc tên kho")

def tim_san_pham(session: Session, tu_khoa: str):
    p = find_product(session, tu_khoa)
    if not p:
        return can_lam_ro("Không tìm thấy sản phẩm theo từ khoá.", [])
    return ok({
        "product_id": p.product_id,
        "sku": p.sku,
        "product_name": p.product_name,
        "min_stock_level": as_int(getattr(p, "min_stock_level", 0)),
    }, "Đã tìm thấy sản phẩm.")

def tim_kho(session: Session, tu_khoa: str):
    w = find_warehouse(session, tu_khoa)
    if not w:
        return can_lam_ro("Không tìm thấy kho theo từ khoá.", [])
    return ok({
        "warehouse_id": w.warehouse_id,
        "warehouse_code": w.warehouse_code,
        "warehouse_name": w.warehouse_name,
    }, "Đã tìm thấy kho.")

DANH_MUC_TOOLS = [
    ToolSpec("tim_san_pham", "Tìm sản phẩm theo SKU hoặc tên.", TimSanPhamArgs, tim_san_pham, "supply_chain"),
    ToolSpec("tim_kho", "Tìm kho theo mã hoặc tên.", TimKhoArgs, tim_kho, "supply_chain"),
]
