from __future__ import annotations
from datetime import datetime, timedelta
from pydantic import BaseModel, Field
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok, can_lam_ro
from app.modules.supply_chain.models import Product, Warehouse, BinLocation, CurrentStock, InventoryTransactionLog
from .helpers import find_product, find_warehouse, like_kw, as_int

class TonTheoTuKhoaArgs(BaseModel):
    tu_khoa: str

class TonTheoKhoArgs(BaseModel):
    tu_khoa_kho: str

class TonTheoKhoVaSanPhamArgs(BaseModel):
    tu_khoa_kho: str
    tu_khoa_san_pham: str

class TonTheoBinArgs(BaseModel):
    bin_id: int

class CanhBaoTonKhoArgs(BaseModel):
    nguong_ton_qua_nhieu: int = 500
    dead_days: int = 90
    limit: int = 20

class KiemTraDuHangArgs(BaseModel):
    tu_khoa_san_pham: str
    so_luong_can: int = 1

class SoLuongTheoSanPhamArgs(BaseModel):
    tu_khoa_san_pham: str

def tra_ton_kho_theo_tu_khoa(session: Session, tu_khoa: str):
    kw = (tu_khoa or "").strip()
    if not kw:
        return can_lam_ro("Bạn cần nhập SKU hoặc tên sản phẩm.", [])
    rows = (
        session.query(
            Product.sku.label("sku"),
            Product.product_name.label("product_name"),
            func.sum(CurrentStock.quantity_on_hand).label("on_hand"),
            func.sum(CurrentStock.quantity_allocated).label("allocated"),
        )
        .join(Product, Product.product_id == CurrentStock.product_id)
        .filter(or_(Product.product_name.ilike(like_kw(kw)), Product.sku.ilike(like_kw(kw))))
        .group_by(Product.sku, Product.product_name)
        .order_by(Product.product_name.asc())
        .all()
    )
    data = []
    for r in rows:
        on_hand = as_int(r.on_hand)
        allocated = as_int(r.allocated)
        data.append({
            "sku": r.sku,
            "product_name": r.product_name,
            "total_on_hand": on_hand,
            "total_allocated": allocated,
            "total_available": on_hand - allocated,
        })
    return ok(data, "Tồn kho theo từ khoá.")

def tra_ton_kho_theo_kho(session: Session, tu_khoa_kho: str):
    w = find_warehouse(session, tu_khoa_kho)
    if not w:
        return can_lam_ro("Không tìm thấy kho.", [])
    rows = (
        session.query(
            Product.sku, Product.product_name,
            func.sum(CurrentStock.quantity_on_hand).label("on_hand"),
            func.sum(CurrentStock.quantity_allocated).label("allocated"),
        )
        .join(Product, Product.product_id == CurrentStock.product_id)
        .filter(CurrentStock.warehouse_id == w.warehouse_id)
        .group_by(Product.sku, Product.product_name)
        .order_by(Product.product_name.asc())
        .all()
    )
    items = []
    for r in rows:
        on_hand = as_int(r.on_hand)
        allocated = as_int(r.allocated)
        items.append({"sku": r.sku, "product_name": r.product_name, "on_hand": on_hand, "allocated": allocated, "available": on_hand - allocated})
    return ok({"warehouse_code": w.warehouse_code, "warehouse_name": w.warehouse_name, "items": items}, "Tồn kho theo kho.")

def tra_ton_kho_theo_kho_va_san_pham(session: Session, tu_khoa_kho: str, tu_khoa_san_pham: str):
    w = find_warehouse(session, tu_khoa_kho)
    if not w:
        return can_lam_ro("Không tìm thấy kho.", [])
    kw = (tu_khoa_san_pham or "").strip()
    if not kw:
        return can_lam_ro("Bạn cần nhập từ khoá sản phẩm.", [])
    rows = (
        session.query(
            Product.sku, Product.product_name,
            func.sum(CurrentStock.quantity_on_hand).label("on_hand"),
            func.sum(CurrentStock.quantity_allocated).label("allocated"),
        )
        .join(Product, Product.product_id == CurrentStock.product_id)
        .filter(CurrentStock.warehouse_id == w.warehouse_id)
        .filter(or_(Product.product_name.ilike(like_kw(kw)), Product.sku.ilike(like_kw(kw))))
        .group_by(Product.sku, Product.product_name)
        .order_by(Product.product_name.asc())
        .all()
    )
    items = []
    for r in rows:
        on_hand = as_int(r.on_hand)
        allocated = as_int(r.allocated)
        items.append({"sku": r.sku, "product_name": r.product_name, "on_hand": on_hand, "allocated": allocated, "available": on_hand - allocated})
    return ok({"warehouse_code": w.warehouse_code, "warehouse_name": w.warehouse_name, "items": items}, "Tồn kho theo kho và sản phẩm.")

def tra_ton_kho_theo_bin(session: Session, bin_id: int):
    rows = (
        session.query(
            BinLocation.bin_code,
            Product.sku, Product.product_name,
            CurrentStock.quantity_on_hand, CurrentStock.quantity_allocated
        )
        .join(BinLocation, BinLocation.bin_id == CurrentStock.bin_id)
        .join(Product, Product.product_id == CurrentStock.product_id)
        .filter(CurrentStock.bin_id == bin_id)
        .order_by(Product.product_name.asc())
        .all()
    )
    items = []
    bin_code = None
    for r in rows:
        bin_code = r.bin_code
        on_hand = as_int(r.quantity_on_hand)
        allocated = as_int(r.quantity_allocated)
        items.append({"bin_code": r.bin_code, "sku": r.sku, "product_name": r.product_name, "on_hand": on_hand, "allocated": allocated, "available": on_hand - allocated})
    return ok({"bin_id": bin_id, "bin_code": bin_code, "items": items}, "Tồn kho theo bin.")

def canh_bao_ton_kho(session: Session, nguong_ton_qua_nhieu: int = 500, dead_days: int = 90, limit: int = 20):
    low_rows = (
        session.query(
            Product.sku, Product.product_name,
            func.sum(CurrentStock.quantity_on_hand).label("qty"),
            Product.min_stock_level,
        )
        .join(Product, Product.product_id == CurrentStock.product_id)
        .group_by(Product.product_id, Product.sku, Product.product_name, Product.min_stock_level)
        .having(func.sum(CurrentStock.quantity_on_hand) < Product.min_stock_level)
        .order_by(func.sum(CurrentStock.quantity_on_hand).asc())
        .limit(limit)
        .all()
    )
    low_stock = [{"sku": r.sku, "product_name": r.product_name, "on_hand": as_int(r.qty), "min_stock_level": as_int(r.min_stock_level)} for r in low_rows]

    over_rows = (
        session.query(Product.sku, Product.product_name, func.sum(CurrentStock.quantity_on_hand).label("qty"))
        .join(Product, Product.product_id == CurrentStock.product_id)
        .group_by(Product.product_id, Product.sku, Product.product_name)
        .having(func.sum(CurrentStock.quantity_on_hand) > int(nguong_ton_qua_nhieu))
        .order_by(func.sum(CurrentStock.quantity_on_hand).desc())
        .limit(limit)
        .all()
    )
    over_stock = [{"sku": r.sku, "product_name": r.product_name, "on_hand": as_int(r.qty), "threshold": int(nguong_ton_qua_nhieu)} for r in over_rows]

    cutoff = datetime.utcnow() - timedelta(days=int(dead_days))
    dead_rows = (
        session.query(Product.sku, Product.product_name)
        .filter(~Product.product_id.in_(
            session.query(InventoryTransactionLog.product_id)
            .filter(InventoryTransactionLog.transaction_date >= cutoff)
        ))
        .order_by(Product.product_name.asc())
        .limit(limit)
        .all()
    )
    dead_stock = [{"sku": r.sku, "product_name": r.product_name, "dead_days": int(dead_days)} for r in dead_rows]

    return ok({"low_stock": low_stock, "over_stock": over_stock, "dead_stock": dead_stock}, "Cảnh báo tồn kho (low/over/dead).")

def so_luong_dang_giu(session: Session, tu_khoa_san_pham: str):
    p = find_product(session, tu_khoa_san_pham)
    if not p:
        return can_lam_ro("Không tìm thấy sản phẩm.", [])
    qty = session.query(func.sum(CurrentStock.quantity_allocated)).filter(CurrentStock.product_id == p.product_id).scalar()
    return ok({"sku": p.sku, "product_name": p.product_name, "allocated": as_int(qty)}, "Số lượng đang giữ (allocated).")

def so_luong_kha_dung(session: Session, tu_khoa_san_pham: str):
    p = find_product(session, tu_khoa_san_pham)
    if not p:
        return can_lam_ro("Không tìm thấy sản phẩm.", [])
    qty = session.query(func.sum(CurrentStock.quantity_on_hand - CurrentStock.quantity_allocated)).filter(CurrentStock.product_id == p.product_id).scalar()
    return ok({"sku": p.sku, "product_name": p.product_name, "available": as_int(qty)}, "Số lượng khả dụng (available).")

def kiem_tra_du_hang(session: Session, tu_khoa_san_pham: str, so_luong_can: int = 1):
    p = find_product(session, tu_khoa_san_pham)
    if not p:
        return can_lam_ro("Không tìm thấy sản phẩm.", [])
    qty = session.query(func.sum(CurrentStock.quantity_on_hand - CurrentStock.quantity_allocated)).filter(CurrentStock.product_id == p.product_id).scalar()
    available = as_int(qty)
    need = as_int(so_luong_can)
    return ok({
        "sku": p.sku,
        "product_name": p.product_name,
        "required_qty": need,
        "available_qty": available,
        "is_enough": available >= need,
    }, "Kiểm tra đủ hàng cho nhu cầu.")

TON_KHO_TOOLS = [
    ToolSpec("tra_ton_kho_theo_tu_khoa", "Tra tồn kho tổng hợp theo SKU/tên (partial).", TonTheoTuKhoaArgs, tra_ton_kho_theo_tu_khoa, "supply_chain"),
    ToolSpec("tra_ton_kho_theo_kho", "Tra tồn kho theo kho.", TonTheoKhoArgs, tra_ton_kho_theo_kho, "supply_chain"),
    ToolSpec("tra_ton_kho_theo_kho_va_san_pham", "Tra tồn kho theo kho và theo từ khoá sản phẩm.", TonTheoKhoVaSanPhamArgs, tra_ton_kho_theo_kho_va_san_pham, "supply_chain"),
    ToolSpec("tra_ton_kho_theo_bin", "Tra tồn kho theo bin/vị trí.", TonTheoBinArgs, tra_ton_kho_theo_bin, "supply_chain"),
    ToolSpec("canh_bao_ton_kho", "Cảnh báo tồn kho: sắp hết / tồn quá nhiều / dead stock.", CanhBaoTonKhoArgs, canh_bao_ton_kho, "supply_chain"),
    ToolSpec("so_luong_dang_giu", "Tính số lượng đang giữ (allocated) theo SKU/tên.", SoLuongTheoSanPhamArgs, so_luong_dang_giu, "supply_chain"),
    ToolSpec("so_luong_kha_dung", "Tính số lượng khả dụng (available) theo SKU/tên.", SoLuongTheoSanPhamArgs, so_luong_kha_dung, "supply_chain"),
    ToolSpec("kiem_tra_du_hang", "Kiểm tra đủ hàng cho nhu cầu theo SKU/tên.", KiemTraDuHangArgs, kiem_tra_du_hang, "supply_chain"),
]