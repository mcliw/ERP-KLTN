from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok
from app.modules.sale_crm.models import Product, ProductVariant, Brand
from app.modules.sale_crm.tools.helpers import to_float, calc_variant_final_price

class ProductIdArgs(BaseModel):
    product_id: int = Field(..., ge=1)

class BrandIdArgs(BaseModel):
    brand_id: int = Field(..., ge=1)
    limit: int = Field(default=20, ge=1, le=200)

class TimSanPhamArgs(BaseModel):
    keyword: str = Field(..., min_length=1, max_length=255)
    only_active: bool = True
    limit: int = Field(default=20, ge=1, le=200)

class TopArgs(BaseModel):
    limit: int = Field(default=10, ge=1, le=200)

class VariantStockArgs(BaseModel):
    product_variant_id: int = Field(..., ge=1)

def thong_tin_san_pham(session: Session, product_id: int) -> Dict[str, Any]:
    row = (
        session.query(Product, Brand)
        .join(Brand, Product.brand_id == Brand.id)
        .filter(Product.id == product_id)
        .first()
    )
    if not row:
        return ok(None, "Không tìm thấy sản phẩm.")
    p, b = row
    return ok({
        "product_id": p.id,
        "name": p.name,
        "description": p.description,
        "avg_rating": to_float(p.avg_rating),
        "total_sold": p.total_sold,
        "total_stock": p.total_stock,
        "is_active": p.is_active,
        "brand": {"brand_id": b.id, "name": b.name, "is_active": b.is_active},
    })

def bien_the_san_pham(session: Session, product_id: int) -> Dict[str, Any]:
    rows = session.query(ProductVariant).filter(ProductVariant.product_id == product_id).all()
    return ok([{
        "product_variant_id": v.id,
        "product_id": v.product_id,
        "name": v.name,
        "stock": v.stock,
        "sold": v.sold,
        "original_price": to_float(v.original_price),
        "discount_amount": to_float(v.discount_amount),
        "discount_percent": to_float(v.discount_percent),
        "final_price": calc_variant_final_price(v.original_price, v.discount_amount, v.discount_percent),
    } for v in rows])

def san_pham_theo_hang(session: Session, brand_id: int, limit: int = 20) -> Dict[str, Any]:
    rows = (
        session.query(Product)
        .filter(Product.brand_id == brand_id, Product.is_active == True)
        .order_by(Product.id.desc())
        .limit(limit)
        .all()
    )
    return ok([{
        "product_id": p.id,
        "name": p.name,
        "avg_rating": to_float(p.avg_rating),
        "total_sold": p.total_sold,
        "total_stock": p.total_stock,
        "is_active": p.is_active,
    } for p in rows])

def tim_san_pham(session: Session, keyword: str, only_active: bool = True, limit: int = 20) -> Dict[str, Any]:
    q = session.query(Product, Brand).join(Brand, Product.brand_id == Brand.id)
    if only_active:
        q = q.filter(Product.is_active == True, Brand.is_active == True)
    like = f"%{keyword}%"
    q = q.filter(or_(Product.name.ilike(like), Product.description.ilike(like), Brand.name.ilike(like)))
    rows = q.limit(limit).all()
    return ok([{
        "product_id": p.id,
        "name": p.name,
        "brand_name": b.name,
        "avg_rating": to_float(p.avg_rating),
        "total_sold": p.total_sold,
        "total_stock": p.total_stock,
        "is_active": p.is_active,
    } for p, b in rows])

def top_san_pham_ban_chay(session: Session, limit: int = 10) -> Dict[str, Any]:
    rows = (
        session.query(Product)
        .filter(Product.is_active == True)
        .order_by(Product.total_sold.desc())
        .limit(limit)
        .all()
    )
    return ok([{
        "product_id": p.id,
        "name": p.name,
        "total_sold": p.total_sold,
        "avg_rating": to_float(p.avg_rating),
    } for p in rows])

def top_bien_the_giam_gia_nhieu(session: Session, limit: int = 10) -> Dict[str, Any]:
    rows = (
        session.query(ProductVariant)
        .order_by(ProductVariant.discount_percent.desc().nullslast(), ProductVariant.discount_amount.desc().nullslast())
        .limit(limit)
        .all()
    )
    return ok([{
        "product_variant_id": v.id,
        "product_id": v.product_id,
        "name": v.name,
        "original_price": to_float(v.original_price),
        "discount_amount": to_float(v.discount_amount),
        "discount_percent": to_float(v.discount_percent),
        "final_price": calc_variant_final_price(v.original_price, v.discount_amount, v.discount_percent),
    } for v in rows])

def kiem_tra_ton_kho_bien_the(session: Session, product_variant_id: int) -> Dict[str, Any]:
    v = session.query(ProductVariant).filter(ProductVariant.id == product_variant_id).first()
    if not v:
        return ok(None, "Không tìm thấy biến thể sản phẩm.")
    return ok({
        "product_variant_id": v.id,
        "product_id": v.product_id,
        "name": v.name,
        "stock": v.stock,
        "sold": v.sold,
    })

PRODUCT_TOOLS: List[ToolSpec] = [
    ToolSpec("thong_tin_san_pham", "Lấy thông tin sản phẩm + hãng.", ProductIdArgs, thong_tin_san_pham, "sale_crm"),
    ToolSpec("bien_the_san_pham", "Danh sách biến thể của sản phẩm.", ProductIdArgs, bien_the_san_pham, "sale_crm"),
    ToolSpec("san_pham_theo_hang", "Danh sách sản phẩm theo hãng (brand).", BrandIdArgs, san_pham_theo_hang, "sale_crm"),
    ToolSpec("tim_san_pham", "Tìm sản phẩm theo từ khóa (name/description/brand).", TimSanPhamArgs, tim_san_pham, "sale_crm"),
    ToolSpec("top_san_pham_ban_chay", "Top sản phẩm bán chạy.", TopArgs, top_san_pham_ban_chay, "sale_crm"),
    ToolSpec("top_bien_the_giam_gia_nhieu", "Top biến thể giảm giá nhiều.", TopArgs, top_bien_the_giam_gia_nhieu, "sale_crm"),
    ToolSpec("kiem_tra_ton_kho_bien_the", "Kiểm tra tồn kho biến thể.", VariantStockArgs, kiem_tra_ton_kho_bien_the, "sale_crm"),
]
