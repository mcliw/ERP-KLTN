from __future__ import annotations
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok, can_lam_ro
from app.modules.supply_chain.models import GoodsIssue, GIItem, Product
from .helpers import norm_code, dt_iso, as_int

class TrangThaiGIArgs(BaseModel):
    gi_code: str

class ChiTietGIArgs(BaseModel):
    gi_code: str

class GITheoLoaiArgs(BaseModel):
    issue_type: str = Field(..., description="SALES_ORDER/INTERNAL_USE/TRANSFER/RETURN_TO_VENDOR")

class GITheoThamChieuArgs(BaseModel):
    reference_doc_id: str

class GIDangChoArgs(BaseModel):
    limit: int = 20

class TongHopXuatArgs(BaseModel):
    limit: int = 30

class TopSanPhamXuatArgs(BaseModel):
    limit: int = 5

def tra_cuu_trang_thai_phieu_xuat(session: Session, gi_code: str):
    code = norm_code(gi_code)

    gi = session.query(GoodsIssue).filter(func.upper(GoodsIssue.gi_code) == code).first()
    if gi:
        return ok(
            {
                "gi_code": gi.gi_code,
                "status": gi.status,
                "issue_type": gi.issue_type,
                "issue_date": dt_iso(gi.issue_date),
            },
            "Trạng thái GI.",
        )

    # Không thấy exact => tìm theo prefix (autocomplete)
    cands = (
        session.query(GoodsIssue.gi_code)
        .filter(func.upper(GoodsIssue.gi_code).like(code + "%"))
        .order_by(GoodsIssue.gi_code.asc())
        .limit(5)
        .all()
    )
    cand_list = [r[0] for r in cands]

    if cand_list:
        return can_lam_ro(
            f"Không tìm thấy GI đúng tuyệt đối cho '{gi_code}'. Bạn có muốn chọn một trong các mã sau không?",
            cand_list,
        )

    return can_lam_ro(
        "Không tìm thấy phiếu xuất (GI). Bạn kiểm tra lại mã (ví dụ GI-20250001).",
        [],
    )


def chi_tiet_phieu_xuat(session: Session, gi_code: str):
    code = norm_code(gi_code)

    gi = session.query(GoodsIssue).filter(func.upper(GoodsIssue.gi_code) == code).first()
    if gi:
        rows = (
            session.query(Product.sku, Product.product_name, GIItem.quantity_issued)
            .join(GIItem, GIItem.product_id == Product.product_id)
            .filter(GIItem.gi_id == gi.gi_id)
            .all()
        )
        items = [
            {"sku": r.sku, "product_name": r.product_name, "quantity_issued": as_int(r.quantity_issued)}
            for r in rows
        ]
        return ok(
            {
                "gi_code": gi.gi_code,
                "status": gi.status,
                "issue_type": gi.issue_type,
                "issue_date": dt_iso(gi.issue_date),
                "items": items,
            },
            "Chi tiết GI.",
        )

    # Không thấy exact => gợi ý theo prefix
    cands = (
        session.query(GoodsIssue.gi_code)
        .filter(func.upper(GoodsIssue.gi_code).like(code + "%"))
        .order_by(GoodsIssue.gi_code.asc())
        .limit(5)
        .all()
    )
    cand_list = [r[0] for r in cands]

    if cand_list:
        return can_lam_ro(
            f"Không tìm thấy GI đúng tuyệt đối cho '{gi_code}'. Bạn có muốn chọn một trong các mã sau không?",
            cand_list,
        )

    return can_lam_ro(
        "Không tìm thấy phiếu xuất (GI). Bạn kiểm tra lại mã (ví dụ GI-20250001).",
        [],
    )


def danh_sach_gi_theo_loai(session: Session, issue_type: str):
    it = norm_code(issue_type)
    rows = (
        session.query(GoodsIssue)
        .filter(func.upper(GoodsIssue.issue_type) == it)
        .order_by(GoodsIssue.issue_date.desc())
        .limit(50)
        .all()
    )
    data = [{"gi_code": r.gi_code, "status": r.status, "issue_type": r.issue_type, "issue_date": dt_iso(r.issue_date)} for r in rows]
    return ok(data, "Danh sách GI theo loại.")

def danh_sach_gi_theo_tham_chieu(session: Session, reference_doc_id: str):
    ref = (reference_doc_id or "").strip()
    if not ref:
        return can_lam_ro("Bạn cần nhập mã tham chiếu.", [])
    rows = (
        session.query(GoodsIssue)
        .filter(GoodsIssue.reference_doc_id == ref)
        .order_by(GoodsIssue.issue_date.desc())
        .limit(50)
        .all()
    )
    data = [{"gi_code": r.gi_code, "status": r.status, "reference_doc_id": r.reference_doc_id, "issue_date": dt_iso(r.issue_date)} for r in rows]
    return ok(data, "Danh sách GI theo tham chiếu.")

def gi_dang_cho_xu_ly(session: Session, limit: int = 20):
    rows = (
        session.query(GoodsIssue)
        .filter(GoodsIssue.status == "DRAFT")
        .order_by(GoodsIssue.issue_date.desc())
        .limit(limit)
        .all()
    )
    data = [{"gi_code": r.gi_code, "status": r.status, "issue_type": r.issue_type, "issue_date": dt_iso(r.issue_date)} for r in rows]
    return ok(data, "GI đang chờ xử lý (DRAFT).")

def tong_hop_xuat_theo_ngay(session: Session, limit: int = 30):
    rows = (
        session.query(func.date(GoodsIssue.issue_date).label("day"), func.sum(GIItem.quantity_issued).label("total_qty"))
        .join(GIItem, GIItem.gi_id == GoodsIssue.gi_id)
        .group_by(func.date(GoodsIssue.issue_date))
        .order_by(func.date(GoodsIssue.issue_date).desc())
        .limit(limit)
        .all()
    )
    data = [{"date": str(r.day), "total_quantity_issued": as_int(r.total_qty)} for r in rows]
    return ok(data, "Tổng hợp xuất theo ngày.")

def top_san_pham_xuat_nhieu(session: Session, limit: int = 5):
    rows = (
        session.query(Product.sku, Product.product_name, func.sum(GIItem.quantity_issued).label("total"))
        .join(GIItem, GIItem.product_id == Product.product_id)
        .group_by(Product.sku, Product.product_name)
        .order_by(func.sum(GIItem.quantity_issued).desc())
        .limit(limit)
        .all()
    )
    data = [{"sku": r.sku, "product_name": r.product_name, "total_quantity_issued": as_int(r.total)} for r in rows]
    return ok(data, "Top sản phẩm xuất nhiều.")

XUAT_KHO_TOOLS = [
    ToolSpec("tra_cuu_trang_thai_phieu_xuat", "Tra trạng thái phiếu xuất (GI).", TrangThaiGIArgs, tra_cuu_trang_thai_phieu_xuat, "supply_chain"),
    ToolSpec("chi_tiet_phieu_xuat", "Tra chi tiết phiếu xuất (GI).", ChiTietGIArgs, chi_tiet_phieu_xuat, "supply_chain"),
    ToolSpec("danh_sach_gi_theo_loai", "Danh sách GI theo loại xuất.", GITheoLoaiArgs, danh_sach_gi_theo_loai, "supply_chain"),
    ToolSpec("danh_sach_gi_theo_tham_chieu", "Danh sách GI theo mã tham chiếu.", GITheoThamChieuArgs, danh_sach_gi_theo_tham_chieu, "supply_chain"),
    ToolSpec("gi_dang_cho_xu_ly", "Danh sách GI đang DRAFT.", GIDangChoArgs, gi_dang_cho_xu_ly, "supply_chain"),
    ToolSpec("tong_hop_xuat_theo_ngay", "Tổng hợp xuất theo ngày.", TongHopXuatArgs, tong_hop_xuat_theo_ngay, "supply_chain"),
    ToolSpec("top_san_pham_xuat_nhieu", "Top sản phẩm xuất nhiều.", TopSanPhamXuatArgs, top_san_pham_xuat_nhieu, "supply_chain"),
]
