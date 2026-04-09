from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok
from app.modules.sale_crm.tools.helpers import to_float, calc_variant_final_price

from app.modules.sale_crm.models import Product, ProductVariant, Brand, Category, CateBrandLink


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


def _join_brand_category(q):
    return (
        q.join(CateBrandLink, Product.cate_brand_link_id == CateBrandLink.id)
        .join(Brand, CateBrandLink.brand_id == Brand.id)
        .outerjoin(Category, CateBrandLink.category_id == Category.id)
    )


def thong_tin_san_pham(session: Session, product_id: int) -> Dict[str, Any]:
    row = (
        _join_brand_category(session.query(Product, Brand, Category))
        .filter(Product.id == product_id)
        .first()
    )
    if not row:
        return ok(None, "Không tìm thấy sản phẩm.")

    p, b, c = row
    return ok(
        {
            "product_id": p.id,
            "name": p.name,
            "description": p.description,
            "avg_rating": to_float(p.avg_rating),
            "total_sold": p.total_sold,
            "total_stock": p.total_stock,
            "is_active": p.is_active,
            "brand": {"brand_id": b.id, "name": b.name, "slug": getattr(b, "slug", None), "logo": getattr(b, "logo", None)},
            "category": None
            if not c
            else {"category_id": c.id, "name": c.name, "slug": getattr(c, "slug", None), "icon_emoji": getattr(c, "icon_emoji", None)},
        }
    )


def bien_the_san_pham(session: Session, product_id: int) -> Dict[str, Any]:
    rows = session.query(ProductVariant).filter(ProductVariant.product_id == product_id).all()
    return ok(
        [
            {
                "product_variant_id": v.id,
                "product_id": v.product_id,
                "name": v.name,
                "stock": v.stock,
                "sold": v.sold,
                "original_price": to_float(v.original_price),
                "discount_amount": to_float(v.discount_amount),
                "discount_percent": to_float(v.discount_percent),
                "final_price": calc_variant_final_price(v.original_price, v.discount_amount, v.discount_percent),
            }
            for v in rows
        ]
    )


def san_pham_theo_hang(session: Session, brand_id: int, limit: int = 20) -> Dict[str, Any]:
    q = (
        _join_brand_category(session.query(Product, Brand, Category))
        .filter(CateBrandLink.brand_id == brand_id, Product.is_active == True)
        .order_by(Product.id.desc())
        .limit(limit)
    )
    rows = q.all()

    return ok(
        [
            {
                "product_id": p.id,
                "name": p.name,
                "avg_rating": to_float(p.avg_rating),
                "total_sold": p.total_sold,
                "total_stock": p.total_stock,
                "is_active": p.is_active,
                "brand_name": b.name,
                "category_name": c.name if c else None,
            }
            for p, b, c in rows
        ]
    )


def tim_san_pham(session: Session, keyword: str, only_active: bool = True, limit: int = 20) -> Dict[str, Any]:
    like = f"%{keyword}%"
    q = _join_brand_category(session.query(Product, Brand, Category))
    if only_active:
        q = q.filter(Product.is_active == True)

    q = q.filter(
        or_(
            Product.name.ilike(like),
            Product.description.ilike(like),
            Brand.name.ilike(like),
            Category.name.ilike(like),
        )
    )

    rows = q.order_by(Product.id.desc()).limit(limit).all()
    return ok(
        [
            {
                "product_id": p.id,
                "name": p.name,
                "brand_name": b.name,
                "category_name": c.name if c else None,
                "avg_rating": to_float(p.avg_rating),
                "total_sold": p.total_sold,
                "total_stock": p.total_stock,
                "is_active": p.is_active,
            }
            for p, b, c in rows
        ]
    )


def top_san_pham_ban_chay(session: Session, limit: int = 10) -> Dict[str, Any]:
    rows = (
        session.query(Product)
        .filter(Product.is_active == True)
        .order_by(Product.total_sold.desc())
        .limit(limit)
        .all()
    )
    return ok(
        [
            {
                "product_id": p.id,
                "name": p.name,
                "total_sold": p.total_sold,
                "avg_rating": to_float(p.avg_rating),
            }
            for p in rows
        ]
    )


def top_bien_the_giam_gia_nhieu(session: Session, limit: int = 10) -> Dict[str, Any]:
    rows = (
        session.query(ProductVariant)
        .order_by(ProductVariant.discount_percent.desc().nullslast(), ProductVariant.discount_amount.desc().nullslast())
        .limit(limit)
        .all()
    )
    return ok(
        [
            {
                "product_variant_id": v.id,
                "product_id": v.product_id,
                "name": v.name,
                "original_price": to_float(v.original_price),
                "discount_amount": to_float(v.discount_amount),
                "discount_percent": to_float(v.discount_percent),
                "final_price": calc_variant_final_price(v.original_price, v.discount_amount, v.discount_percent),
            }
            for v in rows
        ]
    )


def kiem_tra_ton_kho_bien_the(session: Session, product_variant_id: int) -> Dict[str, Any]:
    v = session.query(ProductVariant).filter(ProductVariant.id == product_variant_id).first()
    if not v:
        return ok(None, "Không tìm thấy biến thể sản phẩm.")
    return ok(
        {
            "product_variant_id": v.id,
            "product_id": v.product_id,
            "name": v.name,
            "stock": v.stock,
            "sold": v.sold,
        }
    )


PRODUCT_TOOLS: List[ToolSpec] = [
    ToolSpec("thong_tin_san_pham", "Lấy thông tin sản phẩm + brand/category theo cate_brand_link.", ProductIdArgs, thong_tin_san_pham, "sale_crm"),
    ToolSpec("bien_the_san_pham", "Danh sách biến thể của sản phẩm (product_variant).", ProductIdArgs, bien_the_san_pham, "sale_crm"),
    ToolSpec("san_pham_theo_hang", "Danh sách sản phẩm theo brand_id.", BrandIdArgs, san_pham_theo_hang, "sale_crm"),
    ToolSpec("tim_san_pham", "Tìm sản phẩm theo từ khóa (product/brand/category).", TimSanPhamArgs, tim_san_pham, "sale_crm"),
    ToolSpec("top_san_pham_ban_chay", "Top sản phẩm bán chạy theo product.total_sold.", TopArgs, top_san_pham_ban_chay, "sale_crm"),
    ToolSpec("top_bien_the_giam_gia_nhieu", "Top biến thể giảm giá nhiều (discount_percent/discount_amount).", TopArgs, top_bien_the_giam_gia_nhieu, "sale_crm"),
    ToolSpec("kiem_tra_ton_kho_bien_the", "Kiểm tra tồn kho biến thể.", VariantStockArgs, kiem_tra_ton_kho_bien_the, "sale_crm"),
]
