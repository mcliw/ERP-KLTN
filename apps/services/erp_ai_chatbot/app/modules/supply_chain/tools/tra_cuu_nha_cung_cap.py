from __future__ import annotations
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok, can_lam_ro
from app.modules.supply_chain.models import Supplier, PurchaseOrder, GoodsReceipt
from .helpers import find_supplier

class TimNhaCungCapArgs(BaseModel):
    tu_khoa: str = Field(..., description="Mã hoặc tên nhà cung cấp")

class ThongTinNhaCungCapArgs(BaseModel):
    supplier_code: str

class XepHangNCCArgs(BaseModel):
    limit: int = 10
    
class HieuSuatGiaoHangNCCArgs(BaseModel):
    supplier_code: str | None = Field(None, description="Mã nhà cung cấp (vd: SUP001). Nếu null thì trả về bảng xếp hạng.")
    limit: int = Field(10, ge=1, le=50, description="Số dòng trả về nếu không lọc theo supplier_code")

def tim_nha_cung_cap(session: Session, tu_khoa: str):
    s = find_supplier(session, tu_khoa)
    if not s:
        return can_lam_ro("Không tìm thấy nhà cung cấp.", [])
    return ok({
        "supplier_id": s.supplier_id,
        "supplier_code": s.supplier_code,
        "supplier_name": s.supplier_name,
        "contact_info": getattr(s, "contact_info", None),
    }, "Đã tìm thấy nhà cung cấp.")

def thong_tin_nha_cung_cap(session: Session, supplier_code: str):
    code = (supplier_code or "").strip().upper()
    s = session.query(Supplier).filter(func.upper(Supplier.supplier_code) == code).first()
    if not s:
        return can_lam_ro("Không tìm thấy nhà cung cấp theo mã.", [])
    return ok({
        "supplier_id": s.supplier_id,
        "supplier_code": s.supplier_code,
        "supplier_name": s.supplier_name,
        "contact_info": getattr(s, "contact_info", None),
    }, "Thông tin nhà cung cấp.")

def xep_hang_ncc_theo_so_po(session: Session, limit: int = 10):
    rows = (
        session.query(Supplier.supplier_code, Supplier.supplier_name, func.count(PurchaseOrder.po_id).label("total_orders"))
        .join(PurchaseOrder, PurchaseOrder.supplier_id == Supplier.supplier_id)
        .group_by(Supplier.supplier_code, Supplier.supplier_name)
        .order_by(func.count(PurchaseOrder.po_id).desc())
        .limit(limit)
        .all()
    )
    data = [{"supplier_code": r.supplier_code, "supplier_name": r.supplier_name, "total_orders": int(r.total_orders)} for r in rows]
    return ok(data, "Xếp hạng NCC theo số PO.")

def hieu_suat_giao_hang_ncc(session: Session, supplier_code: str | None = None, limit: int = 10):
    q = (
        session.query(
            Supplier.supplier_code,
            Supplier.supplier_name,
            func.count(GoodsReceipt.gr_id).label("total_receipts")
        )
        .join(PurchaseOrder, PurchaseOrder.supplier_id == Supplier.supplier_id)
        .join(GoodsReceipt, GoodsReceipt.po_id == PurchaseOrder.po_id)
    )

    # Nếu có supplier_code => lọc riêng 1 NCC
    if supplier_code:
        code = supplier_code.strip().upper()
        q = q.filter(func.upper(Supplier.supplier_code) == code)

    q = (
        q.group_by(Supplier.supplier_code, Supplier.supplier_name)
         .order_by(func.count(GoodsReceipt.gr_id).desc())
    )

    # Nếu lọc theo NCC => trả về 1 object
    if supplier_code:
        r = q.first()
        if not r:
            return can_lam_ro("Không tìm thấy dữ liệu hiệu suất giao hàng cho nhà cung cấp này.", [])
        return ok({
            "supplier_code": r.supplier_code,
            "supplier_name": r.supplier_name,
            "total_receipts": int(r.total_receipts),
        }, "Hiệu suất giao hàng NCC (theo số GR).")

    # Không lọc => trả về bảng xếp hạng
    rows = q.limit(limit).all()
    data = [{
        "supplier_code": r.supplier_code,
        "supplier_name": r.supplier_name,
        "total_receipts": int(r.total_receipts)
    } for r in rows]
    return ok(data, "Hiệu suất giao hàng NCC (theo số GR).")


NHA_CUNG_CAP_TOOLS = [
    ToolSpec("tim_nha_cung_cap", "Tìm nhà cung cấp theo mã/tên.", TimNhaCungCapArgs, tim_nha_cung_cap, "supply_chain"),
    ToolSpec("thong_tin_nha_cung_cap", "Xem hồ sơ nhà cung cấp theo mã.", ThongTinNhaCungCapArgs, thong_tin_nha_cung_cap, "supply_chain"),
    ToolSpec("xep_hang_ncc_theo_so_po", "Xếp hạng NCC theo số lượng PO.", XepHangNCCArgs, xep_hang_ncc_theo_so_po, "supply_chain"),
    ToolSpec("hieu_suat_giao_hang_ncc", "Hiệu suất NCC theo số phiếu nhập (GR).", HieuSuatGiaoHangNCCArgs, hieu_suat_giao_hang_ncc, "supply_chain")
]
