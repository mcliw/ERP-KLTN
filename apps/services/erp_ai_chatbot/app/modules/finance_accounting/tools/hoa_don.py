# app/modules/finance_accounting/tools/hoa_don.py
from __future__ import annotations
from typing import Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.ai.tooling import ToolSpec, ok, can_lam_ro
from app.modules.finance_accounting.models import (
    ARInvoice, APInvoice, BusinessPartner, JournalEntry, JournalEntryLine, ChartOfAccounts
)

def _iso(d): return d.isoformat() if d else None
def _to_str(x): return str(x) if x is not None else None

def _partner_brief(bp: BusinessPartner | None):
    if not bp:
        return None
    return {
        "partner_id": bp.partner_id,
        "partner_type": bp.partner_type,
        "external_id": bp.external_id,
        "partner_name": bp.partner_name,
        "tax_code": bp.tax_code,
    }

def _but_toan_from_entry(session: Session, entry_id: int | None):
    if not entry_id:
        return None
    entry = session.query(JournalEntry).filter(JournalEntry.entry_id == entry_id).first()
    if not entry:
        return None
    lines = (
        session.query(JournalEntryLine, ChartOfAccounts)
        .join(ChartOfAccounts, ChartOfAccounts.account_id == JournalEntryLine.account_id)
        .filter(JournalEntryLine.entry_id == entry_id)
        .all()
    )
    line_data = []
    for l, acc in lines:
        line_data.append({
            "account_code": acc.account_code,
            "account_name": acc.account_name,
            "debit_amount": _to_str(l.debit_amount),
            "credit_amount": _to_str(l.credit_amount),
            "description": l.description,
            "partner_id": l.partner_id,
        })
    return {
        "entry_id": entry.entry_id,
        "reference_no": entry.reference_no,
        "transaction_date": _iso(entry.transaction_date),
        "posting_date": _iso(entry.posting_date),
        "status": entry.status,
        "source_module": entry.source_module,
        "lines": line_data,
    }


class ARHoaDonArgs(BaseModel):
    invoice_id: Optional[int] = None
    sales_order_ref: Optional[str] = None


def ar_hd(session: Session, invoice_id: Optional[int] = None, sales_order_ref: Optional[str] = None):
    inv = None
    if invoice_id:
        inv = session.query(ARInvoice).filter(ARInvoice.invoice_id == invoice_id).first()
    elif sales_order_ref:
        inv = session.query(ARInvoice).filter(ARInvoice.sales_order_ref == sales_order_ref.strip()).order_by(ARInvoice.invoice_id.desc()).first()
    else:
        return can_lam_ro("Bạn cung cấp invoice_id hoặc sales_order_ref để tra hóa đơn AR.", [])

    if not inv:
        return can_lam_ro("Không tìm thấy hóa đơn AR theo thông tin bạn đưa.", [])

    bp = session.query(BusinessPartner).filter(BusinessPartner.partner_id == inv.partner_id).first()

    return ok({
        "invoice_id": inv.invoice_id,
        "sales_order_ref": inv.sales_order_ref,
        "invoice_date": _iso(inv.invoice_date),
        "due_date": _iso(inv.due_date),
        "total_amount": _to_str(inv.total_amount),
        "received_amount": _to_str(inv.received_amount),
        "payment_status": inv.payment_status,
        "partner": _partner_brief(bp),
        "entry_id": inv.entry_id,
    }, "Hóa đơn phải thu (AR).")


class ARChiTietArgs(BaseModel):
    invoice_id: Optional[int] = None
    sales_order_ref: Optional[str] = None
    kem_but_toan: bool = True


def ar_ct(session: Session, invoice_id: Optional[int] = None, sales_order_ref: Optional[str] = None, kem_but_toan: bool = True):
    inv = None
    if invoice_id:
        inv = session.query(ARInvoice).filter(ARInvoice.invoice_id == invoice_id).first()
    elif sales_order_ref:
        inv = session.query(ARInvoice).filter(ARInvoice.sales_order_ref == sales_order_ref.strip()).order_by(ARInvoice.invoice_id.desc()).first()
    else:
        return can_lam_ro("Bạn cung cấp invoice_id hoặc sales_order_ref để xem chi tiết AR.", [])

    if not inv:
        return can_lam_ro("Không tìm thấy hóa đơn AR.", [])

    bp = session.query(BusinessPartner).filter(BusinessPartner.partner_id == inv.partner_id).first()
    bt = _but_toan_from_entry(session, inv.entry_id) if kem_but_toan else None

    return ok({
        "invoice_id": inv.invoice_id,
        "sales_order_ref": inv.sales_order_ref,
        "invoice_date": _iso(inv.invoice_date),
        "due_date": _iso(inv.due_date),
        "total_amount": _to_str(inv.total_amount),
        "received_amount": _to_str(inv.received_amount),
        "payment_status": inv.payment_status,
        "partner": _partner_brief(bp),
        "but_toan": bt,
    }, "Chi tiết hóa đơn AR.")


class APHoaDonArgs(BaseModel):
    invoice_id: Optional[int] = None
    purchase_order_ref: Optional[str] = None


def ap_hd(session: Session, invoice_id: Optional[int] = None, purchase_order_ref: Optional[str] = None):
    inv = None
    if invoice_id:
        inv = session.query(APInvoice).filter(APInvoice.invoice_id == invoice_id).first()
    elif purchase_order_ref:
        inv = session.query(APInvoice).filter(APInvoice.purchase_order_ref == purchase_order_ref.strip()).order_by(APInvoice.invoice_id.desc()).first()
    else:
        return can_lam_ro("Bạn cung cấp invoice_id hoặc purchase_order_ref để tra hóa đơn AP.", [])

    if not inv:
        return can_lam_ro("Không tìm thấy hóa đơn AP theo thông tin bạn đưa.", [])

    bp = session.query(BusinessPartner).filter(BusinessPartner.partner_id == inv.partner_id).first()

    return ok({
        "invoice_id": inv.invoice_id,
        "purchase_order_ref": inv.purchase_order_ref,
        "invoice_date": _iso(inv.invoice_date),
        "due_date": _iso(inv.due_date),
        "total_amount": _to_str(inv.total_amount),
        "paid_amount": _to_str(inv.paid_amount),
        "payment_status": inv.payment_status,
        "partner": _partner_brief(bp),
        "entry_id": inv.entry_id,
    }, "Hóa đơn phải trả (AP).")


class APChiTietArgs(BaseModel):
    invoice_id: Optional[int] = None
    purchase_order_ref: Optional[str] = None
    kem_but_toan: bool = True


def ap_ct(session: Session, invoice_id: Optional[int] = None, purchase_order_ref: Optional[str] = None, kem_but_toan: bool = True):
    inv = None
    if invoice_id:
        inv = session.query(APInvoice).filter(APInvoice.invoice_id == invoice_id).first()
    elif purchase_order_ref:
        inv = session.query(APInvoice).filter(APInvoice.purchase_order_ref == purchase_order_ref.strip()).order_by(APInvoice.invoice_id.desc()).first()
    else:
        return can_lam_ro("Bạn cung cấp invoice_id hoặc purchase_order_ref để xem chi tiết AP.", [])

    if not inv:
        return can_lam_ro("Không tìm thấy hóa đơn AP.", [])

    bp = session.query(BusinessPartner).filter(BusinessPartner.partner_id == inv.partner_id).first()
    bt = _but_toan_from_entry(session, inv.entry_id) if kem_but_toan else None

    return ok({
        "invoice_id": inv.invoice_id,
        "purchase_order_ref": inv.purchase_order_ref,
        "invoice_date": _iso(inv.invoice_date),
        "due_date": _iso(inv.due_date),
        "total_amount": _to_str(inv.total_amount),
        "paid_amount": _to_str(inv.paid_amount),
        "payment_status": inv.payment_status,
        "partner": _partner_brief(bp),
        "but_toan": bt,
    }, "Chi tiết hóa đơn AP.")


HOA_DON_TOOLS = [
    ToolSpec("ar_hd", "Tra cứu trạng thái hóa đơn AR (phải thu).", ARHoaDonArgs, ar_hd, "finance_accounting"),
    ToolSpec("ar_ct", "Chi tiết hóa đơn AR (có thể kèm bút toán).", ARChiTietArgs, ar_ct, "finance_accounting"),
    ToolSpec("ap_hd", "Tra cứu trạng thái hóa đơn AP (phải trả).", APHoaDonArgs, ap_hd, "finance_accounting"),
    ToolSpec("ap_ct", "Chi tiết hóa đơn AP (có thể kèm bút toán).", APChiTietArgs, ap_ct, "finance_accounting"),
]
