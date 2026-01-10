from __future__ import annotations
from typing import Optional
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok, can_lam_ro
from app.modules.supply_chain.models import PurchaseRequest, PRItem, Quotation, PurchaseOrder, POItem, Supplier, Product

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

class TraCuuTrangThaiPRArgs(BaseModel):
    pr_code: str

class ChiTietPRArgs(BaseModel):
    pr_code: str

class PRChuaXuLyArgs(BaseModel):
    limit: int = 10

class DanhSachBaoGiaTheoPRArgs(BaseModel):
    pr_code: str

class TraCuuTrangThaiPOArgs(BaseModel):
    po_code: str

class ChiTietPOArgs(BaseModel):
    po_code: str

class POChuaHoanTatArgs(BaseModel):
    limit: int = 10

class TienDoNhapPOArgs(BaseModel):
    po_code: str

class TimPoSapDenHanGiaoNhatArgs(BaseModel):
    pass

def tim_po_sap_den_han_giao_nhat(session):
    po = (
        session.query(PurchaseOrder)
        .filter(PurchaseOrder.status.in_(["APPROVED", "PARTIAL_RECEIVED"]))
        .order_by(PurchaseOrder.expected_delivery_date.asc(), PurchaseOrder.order_date.asc())
        .first()
    )

    if not po:
        return {"ok": True, "data": None, "thong_diep": "Không có PO đang mở/đang xử lý."}

    return {
        "ok": True,
        "data": {
            "po_code": po.po_code,
            "status": po.status,
            "order_date": po.order_date.isoformat() if po.order_date else None,
            "expected_delivery_date": po.expected_delivery_date.isoformat() if po.expected_delivery_date else None,
        },
        "thong_diep": "PO sắp đến hạn giao nhất.",
    }

def tra_cuu_trang_thai_pr(session: Session, pr_code: str):
    code = (pr_code or "").strip().upper()

    pr = session.query(PurchaseRequest).filter(func.upper(PurchaseRequest.pr_code) == code).first()
    if not pr:
        cands = _candidates_by_prefix(session, PurchaseRequest, "pr_code", code, limit=5)
        if cands:
            return can_lam_ro(
                f"Không tìm thấy PR đúng tuyệt đối cho '{pr_code}'. Bạn có muốn chọn một trong các mã sau không?",
                cands,
            )
        return can_lam_ro("Không tìm thấy PR. Bạn kiểm tra lại mã (ví dụ PR-20250001).", [])

    return ok({
        "pr_code": pr.pr_code,
        "status": pr.status,
        "request_date": pr.request_date.isoformat() if pr.request_date else None,
        "requester_id": pr.requester_id,
        "department_id": pr.department_id
    }, "Trạng thái PR.")


def chi_tiet_pr(session: Session, pr_code: str):
    code = (pr_code or "").strip().upper()

    pr = session.query(PurchaseRequest).filter(func.upper(PurchaseRequest.pr_code) == code).first()
    if not pr:
        cands = _candidates_by_prefix(session, PurchaseRequest, "pr_code", code, limit=5)
        if cands:
            return can_lam_ro(
                f"Không tìm thấy PR đúng tuyệt đối cho '{pr_code}'. Bạn có muốn chọn một trong các mã sau không?",
                cands,
            )
        return can_lam_ro("Không tìm thấy PR. Bạn kiểm tra lại mã (ví dụ PR-20250001).", [])

    items = (
        session.query(PRItem, Product)
        .join(Product, Product.product_id == PRItem.product_id)
        .filter(PRItem.pr_id == pr.pr_id)
        .all()
    )
    item_list = []
    for it, p in items:
        item_list.append({
            "sku": p.sku,
            "product_name": p.product_name,
            "quantity_requested": it.quantity_requested,
            "expected_date": it.expected_date.isoformat() if it.expected_date else None
        })
    return ok({
        "pr_code": pr.pr_code,
        "status": pr.status,
        "request_date": pr.request_date.isoformat() if pr.request_date else None,
        "reason": pr.reason,
        "items": item_list
    }, "Chi tiết PR.")


def pr_chua_xu_ly(session: Session, limit: int):
    pr_list = (
        session.query(PurchaseRequest)
        .filter(PurchaseRequest.status.in_(["SUBMITTED", "APPROVED"]))
        .order_by(PurchaseRequest.request_date.desc())
        .limit(limit)
        .all()
    )
    return ok([{
        "pr_code": p.pr_code,
        "status": p.status,
        "request_date": p.request_date.isoformat() if p.request_date else None
    } for p in pr_list], "PR đang mở (chưa xử lý xong).")

def danh_sach_bao_gia_theo_pr(session: Session, pr_code: str):
    code = (pr_code or "").strip().upper()

    pr = session.query(PurchaseRequest).filter(func.upper(PurchaseRequest.pr_code) == code).first()
    if not pr:
        cands = _candidates_by_prefix(session, PurchaseRequest, "pr_code", code, limit=5)
        if cands:
            return can_lam_ro(
                f"Không tìm thấy PR đúng tuyệt đối cho '{pr_code}'. Bạn có muốn chọn một trong các mã sau không?",
                cands,
            )
        return can_lam_ro("Không tìm thấy PR. Bạn kiểm tra lại mã (ví dụ PR-20250001).", [])

    qs = session.query(Quotation).filter(Quotation.pr_id == pr.pr_id).all()
    data = []
    for q in qs:
        sup = session.query(Supplier).filter(Supplier.supplier_id == q.supplier_id).first()
        data.append({
            "rfq_code": q.rfq_code,
            "supplier_code": sup.supplier_code if sup else None,
            "supplier_name": sup.supplier_name if sup else None,
            "total_amount": str(q.total_amount) if q.total_amount is not None else None,
            "status": q.status,
            "is_selected": q.is_selected
        })
    return ok(data, "Danh sách báo giá theo PR.")

def tra_cuu_trang_thai_don_mua(session: Session, po_code: str):
    code = (po_code or "").strip().upper()

    po = session.query(PurchaseOrder).filter(func.upper(PurchaseOrder.po_code) == code).first()
    if not po:
        cands = _candidates_by_prefix(session, PurchaseOrder, "po_code", code, limit=5)
        if cands:
            return can_lam_ro(
                f"Không tìm thấy PO đúng tuyệt đối cho '{po_code}'. Bạn có muốn chọn một trong các mã sau không?",
                cands,
            )
        return can_lam_ro("Không tìm thấy PO. Bạn kiểm tra lại mã (ví dụ PO-20250001).", [])

    sup = session.query(Supplier).filter(Supplier.supplier_id == po.supplier_id).first()
    return ok({
        "po_code": po.po_code,
        "status": po.status,
        "order_date": po.order_date.isoformat() if po.order_date else None,
        "expected_delivery_date": po.expected_delivery_date.isoformat() if po.expected_delivery_date else None,
        "supplier_code": sup.supplier_code if sup else None,
        "supplier_name": sup.supplier_name if sup else None,
        "total_amount": str(po.total_amount),
        "tax_amount": str(po.tax_amount),
        "discount_amount": str(po.discount_amount)
    }, "Trạng thái PO.")

def chi_tiet_po(session: Session, po_code: str):
    code = (po_code or "").strip().upper()

    po = session.query(PurchaseOrder).filter(func.upper(PurchaseOrder.po_code) == code).first()
    if not po:
        cands = _candidates_by_prefix(session, PurchaseOrder, "po_code", code, limit=5)
        if cands:
            return can_lam_ro(
                f"Không tìm thấy PO đúng tuyệt đối cho '{po_code}'. Bạn có muốn chọn một trong các mã sau không?",
                cands,
            )
        return can_lam_ro("Không tìm thấy PO. Bạn kiểm tra lại mã (ví dụ PO-20250001).", [])

    sup = session.query(Supplier).filter(Supplier.supplier_id == po.supplier_id).first()
    items = (
        session.query(POItem, Product)
        .join(Product, Product.product_id == POItem.product_id)
        .filter(POItem.po_id == po.po_id)
        .all()
    )
    item_list = []
    for it, p in items:
        item_list.append({
            "sku": p.sku,
            "product_name": p.product_name,
            "quantity_ordered": it.quantity_ordered,
            "quantity_received": it.quantity_received,
            "unit_price": str(it.unit_price)
        })

    return ok({
        "po_code": po.po_code,
        "status": po.status,
        "supplier_code": sup.supplier_code if sup else None,
        "supplier_name": sup.supplier_name if sup else None,
        "items": item_list
    }, "Chi tiết PO.")

def po_chua_hoan_tat(session: Session, limit: int):
    po_list = (
        session.query(PurchaseOrder)
        .filter(PurchaseOrder.status.in_(["APPROVED", "PARTIAL_RECEIVED"]))
        .order_by(PurchaseOrder.order_date.desc())
        .limit(limit)
        .all()
    )
    return ok([{
        "po_code": p.po_code,
        "status": p.status,
        "order_date": p.order_date.isoformat() if p.order_date else None,
        "expected_delivery_date": p.expected_delivery_date.isoformat() if p.expected_delivery_date else None
    } for p in po_list], "PO chưa hoàn tất.")

def tien_do_nhap_po(session: Session, po_code: str):
    code = (po_code or "").strip().upper()

    po = session.query(PurchaseOrder).filter(func.upper(PurchaseOrder.po_code) == code).first()
    if not po:
        cands = _candidates_by_prefix(session, PurchaseOrder, "po_code", code, limit=5)
        if cands:
            return can_lam_ro(
                f"Không tìm thấy PO đúng tuyệt đối cho '{po_code}'. Bạn có muốn chọn một trong các mã sau không?",
                cands,
            )
        return can_lam_ro("Không tìm thấy PO. Bạn kiểm tra lại mã (ví dụ PO-20250001).", [])

    items = session.query(POItem).filter(POItem.po_id == po.po_id).all()
    if not items:
        return ok({"po_code": po.po_code, "progress_percent": 0, "missing_items": []}, "PO không có dòng hàng.")

    ordered = sum(int(i.quantity_ordered or 0) for i in items)
    received = sum(int(i.quantity_received or 0) for i in items)
    progress = 0 if ordered == 0 else round(received * 100.0 / ordered, 2)

    missing = []
    for it in items:
        if int(it.quantity_received or 0) < int(it.quantity_ordered or 0):
            p = session.query(Product).filter(Product.product_id == it.product_id).first()
            missing.append({
                "sku": p.sku if p else None,
                "product_name": p.product_name if p else None,
                "ordered": it.quantity_ordered,
                "received": it.quantity_received,
                "missing": int(it.quantity_ordered) - int(it.quantity_received)
            })

    return ok({
        "po_code": po.po_code,
        "status": po.status,
        "progress_percent": progress,
        "missing_items": missing
    }, "Tiến độ nhập PO.")


MUA_HANG_TOOLS = [
    ToolSpec("tim_po_sap_den_han_giao_nhat", "Tìm PO có ngày dự kiến giao hàng (ETD) sớm nhất trong các PO đang xử lý (APPROVED/PARTIAL_RECEIVED).",TimPoSapDenHanGiaoNhatArgs, tim_po_sap_den_han_giao_nhat, "supply_chain"),
    ToolSpec("tra_cuu_trang_thai_pr", "Tra cứu trạng thái yêu cầu mua (PR).", TraCuuTrangThaiPRArgs, tra_cuu_trang_thai_pr, "supply_chain"),
    ToolSpec("chi_tiet_pr", "Tra cứu chi tiết PR và dòng hàng.", ChiTietPRArgs, chi_tiet_pr, "supply_chain"),
    ToolSpec("pr_chua_xu_ly", "Danh sách PR đang mở.", PRChuaXuLyArgs, pr_chua_xu_ly, "supply_chain"),
    ToolSpec("danh_sach_bao_gia_theo_pr", "Danh sách báo giá (RFQ) theo PR.", DanhSachBaoGiaTheoPRArgs, danh_sach_bao_gia_theo_pr, "supply_chain"),
    ToolSpec("tra_cuu_trang_thai_don_mua", "Tra cứu trạng thái đơn mua (PO).", TraCuuTrangThaiPOArgs, tra_cuu_trang_thai_don_mua, "supply_chain"),
    ToolSpec("chi_tiet_po", "Tra cứu chi tiết PO và dòng hàng.", ChiTietPOArgs, chi_tiet_po, "supply_chain"),
    ToolSpec("po_chua_hoan_tat", "Danh sách PO chưa hoàn tất.", POChuaHoanTatArgs, po_chua_hoan_tat, "supply_chain"),
    ToolSpec("tien_do_nhap_po", "Tính % tiến độ nhập của PO và các mặt hàng còn thiếu.", TienDoNhapPOArgs, tien_do_nhap_po, "supply_chain"),
]
