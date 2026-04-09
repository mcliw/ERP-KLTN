from __future__ import annotations

from datetime import date
from typing import Optional

from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok, can_lam_ro
from app.modules.finance_accounting.models import APInvoice, BusinessPartner, JournalEntry
from .helpers import norm_text, norm_code, iso_date, to_str, fmt_money, candidates_by_prefix, require_any


class APTrangThaiArgs(BaseModel):
    invoice_id: Optional[int] = None
    ref: Optional[str] = None  # purchase_order_ref hoặc journal_entries.reference_no


class APChiTietArgs(BaseModel):
    invoice_id: Optional[int] = None
    ref: Optional[str] = None


class APDanhSachArgs(BaseModel):
    external_id: Optional[str] = None  # SUPPLIER external_id
    payment_status: Optional[str] = None  # UNPAID/PARTIAL/PAID
    from_date: Optional[date] = None
    to_date: Optional[date] = None
    limit: int = 20


class APQuaHanArgs(BaseModel):
    as_of: Optional[date] = None
    limit: int = 20


def _find_ap_invoice(session: Session, invoice_id: Optional[int], ref: Optional[str]):
    if invoice_id:
        return session.query(APInvoice).filter(APInvoice.invoice_id == invoice_id).first()

    if ref:
        r = norm_text(ref)
        inv = session.query(APInvoice).filter(APInvoice.purchase_order_ref == r).first()
        if inv:
            return inv
        inv = (
            session.query(APInvoice)
            .join(JournalEntry, JournalEntry.entry_id == APInvoice.entry_id)
            .filter(JournalEntry.reference_no == r)
            .first()
        )
        if inv:
            return inv

    return None


def _ap_candidates(session: Session, ref: str) -> list[str]:
    r = norm_text(ref)
    c1 = candidates_by_prefix(session, APInvoice, "purchase_order_ref", r, limit=6)
    c2 = candidates_by_prefix(session, JournalEntry, "reference_no", r, limit=6)
    out: list[str] = []
    for x in (c1 + c2):
        if x and x not in out:
            out.append(x)
    return out[:10]


def ap_trang_thai(session: Session, invoice_id: Optional[int] = None, ref: Optional[str] = None):
    missing = require_any(invoice_id=invoice_id, ref=ref)
    if missing:
        return missing

    inv = _find_ap_invoice(session, invoice_id, ref)
    if not inv:
        cands = _ap_candidates(session, ref or "") if ref else []
        if cands:
            return can_lam_ro(f"Không tìm thấy AP invoice cho '{ref}'. Bạn muốn chọn mã nào?", cands)
        return can_lam_ro("Không tìm thấy AP invoice.", [])

    bp = session.query(BusinessPartner).filter(BusinessPartner.partner_id == inv.partner_id).first()
    outstanding = (inv.total_amount or 0) - (inv.paid_amount or 0)

    ans = (
        f"AP invoice {(inv.purchase_order_ref or inv.invoice_id)}: {inv.payment_status}. "
        f"Tổng {fmt_money(inv.total_amount)}, đã trả {fmt_money(inv.paid_amount)}, còn {fmt_money(outstanding)}."
    )

    return ok(
        {
            "invoice_id": inv.invoice_id,
            "ref": inv.purchase_order_ref,
            "invoice_date": iso_date(inv.invoice_date),
            "due_date": iso_date(inv.due_date),
            "payment_status": inv.payment_status,
            "total_amount": to_str(inv.total_amount),
            "paid_amount": to_str(inv.paid_amount),
            "outstanding": to_str(outstanding),
            "supplier": {
                "external_id": bp.external_id if bp else None,
                "partner_name": bp.partner_name if bp else None,
            },
            "entry_id": inv.entry_id,
        },
        "Trạng thái hóa đơn mua (AP).",
        answer=ans,
    )


def ap_chi_tiet(session: Session, invoice_id: Optional[int] = None, ref: Optional[str] = None):
    missing = require_any(invoice_id=invoice_id, ref=ref)
    if missing:
        return missing

    inv = _find_ap_invoice(session, invoice_id, ref)
    if not inv:
        cands = _ap_candidates(session, ref or "") if ref else []
        if cands:
            return can_lam_ro(f"Không tìm thấy AP invoice cho '{ref}'. Bạn muốn chọn mã nào?", cands)
        return can_lam_ro("Không tìm thấy AP invoice.", [])

    bp = session.query(BusinessPartner).filter(BusinessPartner.partner_id == inv.partner_id).first()
    je = session.query(JournalEntry).filter(JournalEntry.entry_id == inv.entry_id).first() if inv.entry_id else None
    outstanding = (inv.total_amount or 0) - (inv.paid_amount or 0)

    return ok(
        {
            "invoice_id": inv.invoice_id,
            "ref": inv.purchase_order_ref,
            "invoice_date": iso_date(inv.invoice_date),
            "due_date": iso_date(inv.due_date),
            "total_amount": to_str(inv.total_amount),
            "paid_amount": to_str(inv.paid_amount),
            "outstanding": to_str(outstanding),
            "payment_status": inv.payment_status,
            "supplier": {
                "partner_id": bp.partner_id if bp else None,
                "external_id": bp.external_id if bp else None,
                "partner_name": bp.partner_name if bp else None,
                "tax_code": bp.tax_code if bp else None,
            },
            "journal_entry": {
                "entry_id": je.entry_id if je else inv.entry_id,
                "reference_no": je.reference_no if je else None,
                "transaction_date": iso_date(je.transaction_date) if je else None,
                "status": je.status if je else None,
            }
            if (je or inv.entry_id)
            else None,
        },
        "Chi tiết hóa đơn mua (AP).",
    )


def ap_danh_sach(
    session: Session,
    external_id: Optional[str] = None,
    payment_status: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    limit: int = 20,
):
    q = session.query(APInvoice).join(BusinessPartner, BusinessPartner.partner_id == APInvoice.partner_id)
    q = q.filter(BusinessPartner.partner_type == "SUPPLIER")

    if external_id:
        ext = norm_text(external_id)
        q = q.filter(BusinessPartner.external_id == ext)

    if payment_status:
        q = q.filter(APInvoice.payment_status == norm_code(payment_status))

    if from_date:
        q = q.filter(APInvoice.invoice_date >= from_date)
    if to_date:
        q = q.filter(APInvoice.invoice_date <= to_date)

    rows = (
        q.with_entities(
            APInvoice.invoice_id,
            APInvoice.purchase_order_ref,
            APInvoice.invoice_date,
            APInvoice.due_date,
            APInvoice.payment_status,
            APInvoice.total_amount,
            APInvoice.paid_amount,
            BusinessPartner.external_id,
            BusinessPartner.partner_name,
            APInvoice.entry_id,
        )
        .order_by(APInvoice.invoice_date.desc(), APInvoice.invoice_id.desc())
        .limit(max(1, min(limit, 100)))
        .all()
    )

    data = []
    for r in rows:
        total = r[5] or 0
        paid = r[6] or 0
        data.append(
            {
                "invoice_id": r[0],
                "ref": r[1],
                "invoice_date": iso_date(r[2]),
                "due_date": iso_date(r[3]),
                "payment_status": r[4],
                "total_amount": to_str(total),
                "paid_amount": to_str(paid),
                "outstanding": to_str(total - paid),
                "supplier_external_id": r[7],
                "supplier_name": r[8],
                "entry_id": r[9],
            }
        )

    return ok(data, "Danh sách hóa đơn mua (AP).")


def ap_qua_han(session: Session, as_of: Optional[date] = None, limit: int = 20):
    as_of = as_of or date.today()

    q = (
        session.query(APInvoice)
        .join(BusinessPartner, BusinessPartner.partner_id == APInvoice.partner_id)
        .filter(BusinessPartner.partner_type == "SUPPLIER")
        .filter(APInvoice.due_date.isnot(None))
        .filter(APInvoice.due_date < as_of)
        .filter(APInvoice.payment_status != "PAID")
    )

    rows = (
        q.with_entities(
            APInvoice.invoice_id,
            APInvoice.purchase_order_ref,
            APInvoice.due_date,
            APInvoice.total_amount,
            APInvoice.paid_amount,
            BusinessPartner.external_id,
            BusinessPartner.partner_name,
        )
        .order_by(APInvoice.due_date.asc(), APInvoice.invoice_id.asc())
        .limit(max(1, min(limit, 100)))
        .all()
    )

    data = []
    for r in rows:
        total = r[3] or 0
        paid = r[4] or 0
        data.append(
            {
                "invoice_id": r[0],
                "ref": r[1],
                "due_date": iso_date(r[2]),
                "total_amount": to_str(total),
                "paid_amount": to_str(paid),
                "outstanding": to_str(total - paid),
                "supplier_external_id": r[5],
                "supplier_name": r[6],
            }
        )

    ans = f"Tìm thấy {len(data)} AP invoice quá hạn đến {as_of.isoformat()}." if data else "Không có AP invoice quá hạn."

    return ok(
        {"as_of": as_of.isoformat(), "rows": data},
        "Danh sách hóa đơn mua quá hạn.",
        answer=ans,
    )


HOA_DON_AP_TOOLS = [
    ToolSpec("ap_trang_thai", "Tra trạng thái hóa đơn mua (AP) theo invoice_id hoặc ref.", APTrangThaiArgs, ap_trang_thai, "finance_accounting"),
    ToolSpec("ap_chi_tiet", "Chi tiết hóa đơn mua (AP) theo invoice_id hoặc ref.", APChiTietArgs, ap_chi_tiet, "finance_accounting"),
    ToolSpec("ap_danh_sach", "Danh sách hóa đơn mua (AP) theo nhà cung cấp/trạng thái/khoảng ngày.", APDanhSachArgs, ap_danh_sach, "finance_accounting"),
    ToolSpec("ap_qua_han", "Danh sách hóa đơn mua (AP) quá hạn (due_date < as_of, chưa PAID).", APQuaHanArgs, ap_qua_han, "finance_accounting"),
]
