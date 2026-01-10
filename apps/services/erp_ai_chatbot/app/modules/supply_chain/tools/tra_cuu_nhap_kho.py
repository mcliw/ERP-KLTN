from __future__ import annotations
from datetime import datetime, timedelta
from pydantic import BaseModel
from sqlalchemy import func, and_
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok, can_lam_ro
from app.modules.supply_chain.models import GoodsReceipt, GRItem, PurchaseOrder, POItem, Supplier, Product, Warehouse
from .helpers import norm_code, dt_iso, find_supplier, as_int
from pydantic import Field

from pydantic import BaseModel, Field, AliasChoices

def _candidates_by_prefix(session: Session, model_cls, code_field, prefix: str, limit: int = 5) -> list[str]:
    if not prefix:
        return []
    col = getattr(model_cls, code_field)
    rows = (
        session.query(col)
        .filter(func.upper(col).like(prefix + "%"))
        .order_by(col.asc())
        .limit(limit)
        .all()
    )
    return [r[0] for r in rows]

class DanhSachGRTheoNhaCungCapArgs(BaseModel):
    supplier_code: str = Field(
        ...,
        description="Mã hoặc tên nhà cung cấp (vd: SUP001)",
        validation_alias=AliasChoices("supplier_code", "tu_khoa_ncc")
    )
    limit: int = Field(5, ge=1, le=20, description="Số phiếu nhập gần nhất cần lấy")


class TrangThaiGRArgs(BaseModel):
    gr_code: str

class ChiTietGRArgs(BaseModel):
    gr_code: str

class GRTheoPOArgs(BaseModel):
    po_code: str

class GRTheoNCCArgs(BaseModel):
    tu_khoa_ncc: str

class GRGanDayArgs(BaseModel):
    days: int = 7
    limit: int = 20

class DoiChieuPOvsGRArgs(BaseModel):
    po_code: str

class PONhanMotPhanArgs(BaseModel):
    limit: int = 20

def tra_cuu_trang_thai_phieu_nhap(session: Session, gr_code: str):
    code = norm_code(gr_code)

    gr = session.query(GoodsReceipt).filter(func.upper(GoodsReceipt.gr_code) == code).first()
    if not gr:
        cands = _candidates_by_prefix(session, GoodsReceipt, "gr_code", code, limit=5)
        if cands:
            return can_lam_ro(
                f"Không tìm thấy GR đúng tuyệt đối cho '{gr_code}'. Bạn có muốn chọn một trong các mã sau không?",
                cands,
            )
        return can_lam_ro("Không tìm thấy phiếu nhập (GR). Bạn kiểm tra lại mã (ví dụ GR-20250001).", [])

    return ok({"gr_code": gr.gr_code, "status": gr.status, "receipt_date": dt_iso(gr.receipt_date)}, "Trạng thái GR.")

def chi_tiet_phieu_nhap(session: Session, gr_code: str):
    code = norm_code(gr_code)

    gr = session.query(GoodsReceipt).filter(func.upper(GoodsReceipt.gr_code) == code).first()
    if not gr:
        cands = _candidates_by_prefix(session, GoodsReceipt, "gr_code", code, limit=5)
        if cands:
            return can_lam_ro(
                f"Không tìm thấy GR đúng tuyệt đối cho '{gr_code}'. Bạn có muốn chọn một trong các mã sau không?",
                cands,
            )
        return can_lam_ro("Không tìm thấy phiếu nhập (GR). Bạn kiểm tra lại mã (ví dụ GR-20250001).", [])

    wh = session.query(Warehouse).filter(Warehouse.warehouse_id == gr.warehouse_id).first()
    rows = (
        session.query(Product.sku, Product.product_name, GRItem.quantity_received)
        .join(GRItem, GRItem.product_id == Product.product_id)
        .filter(GRItem.gr_id == gr.gr_id)
        .all()
    )
    items = [{"sku": r.sku, "product_name": r.product_name, "quantity_received": as_int(r.quantity_received)} for r in rows]
    return ok({
        "gr_code": gr.gr_code,
        "status": gr.status,
        "receipt_date": dt_iso(gr.receipt_date),
        "warehouse_code": wh.warehouse_code if wh else None,
        "warehouse_name": wh.warehouse_name if wh else None,
        "items": items
    }, "Chi tiết GR.")

def danh_sach_gr_theo_po(session: Session, po_code: str):
    code = norm_code(po_code)

    po = session.query(PurchaseOrder).filter(func.upper(PurchaseOrder.po_code) == code).first()
    if not po:
        cands = _candidates_by_prefix(session, PurchaseOrder, "po_code", code, limit=5)
        if cands:
            return can_lam_ro(
                f"Không tìm thấy PO đúng tuyệt đối cho '{po_code}'. Bạn có muốn chọn một trong các mã sau không?",
                cands,
            )
        return can_lam_ro("Không tìm thấy PO. Bạn kiểm tra lại mã (ví dụ PO-20250001).", [])

    grs = (
        session.query(GoodsReceipt)
        .filter(GoodsReceipt.po_id == po.po_id)
        .order_by(GoodsReceipt.receipt_date.desc())
        .all()
    )
    data = [{"gr_code": g.gr_code, "status": g.status, "receipt_date": dt_iso(g.receipt_date)} for g in grs]
    return ok({"po_code": po.po_code, "gr_list": data}, "Danh sách GR theo PO.")

def danh_sach_gr_theo_nha_cung_cap(session: Session, supplier_code: str, limit: int = 5):
    s = find_supplier(session, supplier_code)  # vẫn dùng find_supplier để hỗ trợ mã/tên
    if not s:
        return can_lam_ro("Không tìm thấy nhà cung cấp.", [])

    lim = max(1, min(int(limit or 5), 20))

    grs = (
        session.query(GoodsReceipt, PurchaseOrder)
        .join(PurchaseOrder, PurchaseOrder.po_id == GoodsReceipt.po_id)
        .filter(PurchaseOrder.supplier_id == s.supplier_id)
        .order_by(GoodsReceipt.receipt_date.desc())
        .limit(lim)
        .all()
    )

    data = [{"gr_code": g.gr_code, "status": g.status, "receipt_date": dt_iso(g.receipt_date), "po_code": po.po_code} for g, po in grs]
    return ok(
        {"supplier_code": s.supplier_code, "supplier_name": s.supplier_name, "limit": lim, "total_returned": len(data), "gr_list": data},
        "Danh sách GR theo NCC (gần nhất)."
    )


def gr_gan_day(session: Session, days: int = 7, limit: int = 20):
    cutoff = datetime.utcnow() - timedelta(days=int(days))
    grs = (
        session.query(GoodsReceipt)
        .filter(GoodsReceipt.receipt_date >= cutoff)
        .order_by(GoodsReceipt.receipt_date.desc())
        .limit(limit)
        .all()
    )
    data = [{"gr_code": g.gr_code, "status": g.status, "receipt_date": dt_iso(g.receipt_date)} for g in grs]
    return ok(data, "GR gần đây.")

def doi_chieu_so_luong_po_va_gr(session: Session, po_code: str):
    code = norm_code(po_code)

    po = session.query(PurchaseOrder).filter(func.upper(PurchaseOrder.po_code) == code).first()
    if not po:
        cands = _candidates_by_prefix(session, PurchaseOrder, "po_code", code, limit=5)
        if cands:
            return can_lam_ro(
                f"Không tìm thấy PO đúng tuyệt đối cho '{po_code}'. Bạn có muốn chọn một trong các mã sau không?",
                cands,
            )
        return can_lam_ro("Không tìm thấy PO. Bạn kiểm tra lại mã (ví dụ PO-20250001).", [])

    rows = (
        session.query(
            Product.sku.label("sku"),
            Product.product_name.label("product_name"),
            POItem.quantity_ordered.label("ordered_quantity"),
            func.coalesce(func.sum(GRItem.quantity_received), 0).label("received_quantity"),
        )
        .join(POItem, POItem.product_id == Product.product_id)
        .outerjoin(GRItem, GRItem.product_id == Product.product_id)
        .outerjoin(GoodsReceipt, and_(GoodsReceipt.gr_id == GRItem.gr_id, GoodsReceipt.po_id == po.po_id))
        .filter(POItem.po_id == po.po_id)
        .group_by(Product.sku, Product.product_name, POItem.quantity_ordered)
        .all()
    )

    items = []
    for r in rows:
        ordered = as_int(r.ordered_quantity)
        received = as_int(r.received_quantity)
        items.append({"sku": r.sku, "product_name": r.product_name, "ordered": ordered, "received": received, "missing": max(0, ordered - received)})

    return ok({"po_code": po.po_code, "status": po.status, "items": items}, "Đối chiếu PO vs GR (đã nhận/thiếu).")

def po_nhan_mot_phan(session: Session, limit: int = 20):
    rows = (
        session.query(PurchaseOrder)
        .filter(PurchaseOrder.status == "PARTIAL_RECEIVED")
        .order_by(PurchaseOrder.order_date.desc())
        .limit(limit)
        .all()
    )
    data = [{"po_code": r.po_code, "status": r.status, "order_date": str(r.order_date), "expected_delivery_date": str(r.expected_delivery_date)} for r in rows]
    return ok(data, "Danh sách PO đang nhận một phần (PARTIAL_RECEIVED).")

NHAP_KHO_TOOLS = [
    ToolSpec("tra_cuu_trang_thai_phieu_nhap", "Tra trạng thái phiếu nhập (GR).", TrangThaiGRArgs, tra_cuu_trang_thai_phieu_nhap, "supply_chain"),
    ToolSpec("chi_tiet_phieu_nhap", "Tra chi tiết phiếu nhập (GR).", ChiTietGRArgs, chi_tiet_phieu_nhap, "supply_chain"),
    ToolSpec("danh_sach_gr_theo_po", "Danh sách GR theo PO.", GRTheoPOArgs, danh_sach_gr_theo_po, "supply_chain"),
    ToolSpec("doi_chieu_so_luong_po_va_gr", "Đối chiếu số lượng PO vs GR theo PO code.", DoiChieuPOvsGRArgs, doi_chieu_so_luong_po_va_gr, "supply_chain"),
    ToolSpec("po_nhan_mot_phan", "Danh sách PO PARTIAL_RECEIVED.", PONhanMotPhanArgs, po_nhan_mot_phan, "supply_chain"),
    ToolSpec("danh_sach_gr_theo_nha_cung_cap", "Danh sách phiếu nhập (GR) theo nhà cung cấp, có giới hạn số dòng.", DanhSachGRTheoNhaCungCapArgs, danh_sach_gr_theo_nha_cung_cap, "supply_chain"),
    ToolSpec("gr_gan_day", "Danh sách phiếu nhập (GR) trong N ngày gần đây.", GRGanDayArgs, gr_gan_day, "supply_chain"),
]
