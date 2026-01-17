from __future__ import annotations
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import date

from app.ai.tooling import ToolSpec, ok, can_lam_ro
from app.modules.finance_accounting.models import Invoice, InvoiceLine, BusinessPartner


def _candidates_by_prefix(session: Session, prefix: str, limit: int = 5) -> list[str]:
    if not prefix:
        return []
    rows = (
        session.query(Invoice.invoice_code)
        .filter(func.upper(Invoice.invoice_code).like(prefix.upper() + "%"))
        .order_by(Invoice.invoice_code.asc())
        .limit(limit)
        .all()
    )
    return [r[0] for r in rows]


class TraCuuTrangThaiHoaDonArgs(BaseModel):
    invoice_code: str


def tra_cuu_trang_thai_hoa_don(session: Session, invoice_code: str):
    code = (invoice_code or "").strip().upper()
    inv = session.query(Invoice).filter(func.upper(Invoice.invoice_code) == code).first()
    if not inv:
        cands = _candidates_by_prefix(session, code, 5)
        if cands:
            return can_lam_ro(f"Không tìm thấy hóa đơn đúng mã '{invoice_code}'. Bạn muốn chọn mã nào?", cands)
        return can_lam_ro("Không tìm thấy hóa đơn. Bạn kiểm tra lại mã.", [])

    return ok({
        "invoice_code": inv.invoice_code,
        "invoice_type": inv.invoice_type,
        "status": inv.status,
        "invoice_date": inv.invoice_date.isoformat() if inv.invoice_date else None,
        "due_date": inv.due_date.isoformat() if inv.due_date else None,
        "total_amount": str(inv.total_amount) if inv.total_amount is not None else None,
        "paid_amount": str(inv.paid_amount) if inv.paid_amount is not None else None,
        "partner_id": inv.partner_id,
    }, "Trạng thái hóa đơn.")


class ChiTietHoaDonArgs(BaseModel):
    invoice_code: str


def chi_tiet_hoa_don(session: Session, invoice_code: str):
    code = (invoice_code or "").strip().upper()
    inv = session.query(Invoice).filter(func.upper(Invoice.invoice_code) == code).first()
    if not inv:
        cands = _candidates_by_prefix(session, code, 5)
        if cands:
            return can_lam_ro(f"Không tìm thấy hóa đơn đúng mã '{invoice_code}'. Bạn muốn chọn mã nào?", cands)
        return can_lam_ro("Không tìm thấy hóa đơn. Bạn kiểm tra lại mã.", [])

    bp = session.query(BusinessPartner).filter(BusinessPartner.partner_id == inv.partner_id).first()

    lines = session.query(InvoiceLine).filter(InvoiceLine.invoice_id == inv.invoice_id).all()
    line_list = [{
        "description": l.description,
        "quantity": str(l.quantity) if l.quantity is not None else None,
        "unit_price": str(l.unit_price) if l.unit_price is not None else None,
        "line_amount": str(l.line_amount) if l.line_amount is not None else None,
    } for l in lines]

    return ok({
        "invoice_code": inv.invoice_code,
        "invoice_type": inv.invoice_type,
        "status": inv.status,
        "invoice_date": inv.invoice_date.isoformat() if inv.invoice_date else None,
        "due_date": inv.due_date.isoformat() if inv.due_date else None,
        "currency": inv.currency,
        "total_amount": str(inv.total_amount) if inv.total_amount is not None else None,
        "paid_amount": str(inv.paid_amount) if inv.paid_amount is not None else None,
        "partner": {
            "partner_code": bp.partner_code if bp else None,
            "partner_name": bp.partner_name if bp else None,
            "partner_type": bp.partner_type if bp else None,
        },
        "lines": line_list,
        "note": inv.note,
    }, "Chi tiết hóa đơn.")


class DanhSachHoaDonTheoDoiTacArgs(BaseModel):
    partner_code: str
    invoice_type: str | None = None  # AR/AP
    status: str | None = None
    limit: int = 10


def danh_sach_hoa_don_theo_doi_tac(session: Session, partner_code: str, invoice_type: str | None = None, status: str | None = None, limit: int = 10):
    code = (partner_code or "").strip().upper()
    bp = session.query(BusinessPartner).filter(func.upper(BusinessPartner.partner_code) == code).first()
    if not bp:
        return can_lam_ro("Không tìm thấy đối tác theo mã. Bạn kiểm tra lại partner_code.", [])

    q = session.query(Invoice).filter(Invoice.partner_id == bp.partner_id)

    if invoice_type:
        q = q.filter(Invoice.invoice_type == invoice_type)
    if status:
        q = q.filter(Invoice.status == status)

    rows = q.order_by(Invoice.invoice_date.desc().nullslast(), Invoice.invoice_id.desc()).limit(limit).all()

    data = [{
        "invoice_code": r.invoice_code,
        "invoice_type": r.invoice_type,
        "status": r.status,
        "invoice_date": r.invoice_date.isoformat() if r.invoice_date else None,
        "due_date": r.due_date.isoformat() if r.due_date else None,
        "total_amount": str(r.total_amount) if r.total_amount is not None else None,
        "paid_amount": str(r.paid_amount) if r.paid_amount is not None else None,
    } for r in rows]

    return ok({
        "partner_code": bp.partner_code,
        "partner_name": bp.partner_name,
        "rows": data,
    }, "Danh sách hóa đơn theo đối tác.")


INVOICES_TOOLS = [
    ToolSpec("tra_cuu_trang_thai_hoa_don", "Tra cứu trạng thái hóa đơn theo mã.", TraCuuTrangThaiHoaDonArgs, tra_cuu_trang_thai_hoa_don, "finance_accounting"),
    ToolSpec("chi_tiet_hoa_don", "Tra cứu chi tiết hóa đơn (kèm dòng).", ChiTietHoaDonArgs, chi_tiet_hoa_don, "finance_accounting"),
    ToolSpec("danh_sach_hoa_don_theo_doi_tac", "Liệt kê hóa đơn theo đối tác (lọc AR/AP, status).", DanhSachHoaDonTheoDoiTacArgs, danh_sach_hoa_don_theo_doi_tac, "finance_accounting"),
]
