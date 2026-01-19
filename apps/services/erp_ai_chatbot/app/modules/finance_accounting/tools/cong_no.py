from __future__ import annotations

from typing import Optional
from datetime import date
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.ai.tooling import ToolSpec, ok, can_lam_ro
from app.modules.finance_accounting.models import ARInvoice, APInvoice, BusinessPartner
from .helpers import to_str, fmt_money, safe_limit, today, iso


class ARCongNoArgs(BaseModel):
    external_id: Optional[str] = Field(None, description="external_id CUSTOMER (vd KH001)")
    as_of: Optional[date] = None
    top: int = 20


class APCongNoArgs(BaseModel):
    external_id: Optional[str] = Field(None, description="external_id SUPPLIER (vd NCC001)")
    as_of: Optional[date] = None
    top: int = 20


class CongNoTongHopArgs(BaseModel):
    as_of: Optional[date] = None


class ARCongNoChiTietArgs(BaseModel):
    external_id: str = Field(..., description="external_id CUSTOMER")
    as_of: Optional[date] = None
    limit: int = 30


class APCongNoChiTietArgs(BaseModel):
    external_id: str = Field(..., description="external_id SUPPLIER")
    as_of: Optional[date] = None
    limit: int = 30


def ar_no(session: Session, external_id: Optional[str] = None, as_of: Optional[date] = None, top: int = 20):
    as_of = as_of or today()
    q = session.query(ARInvoice).filter(ARInvoice.invoice_date <= as_of)

    if external_id:
        bp = session.query(BusinessPartner).filter(
            BusinessPartner.partner_type == "CUSTOMER",
            BusinessPartner.external_id == external_id.strip()
        ).first()
        if not bp:
            return can_lam_ro("Không tìm thấy CUSTOMER theo external_id.", [])
        q = q.filter(ARInvoice.partner_id == bp.partner_id)

    total = q.with_entities(func.coalesce(func.sum(ARInvoice.total_amount), 0)).scalar() or 0
    recv = q.with_entities(func.coalesce(func.sum(ARInvoice.received_amount), 0)).scalar() or 0
    out = (total or 0) - (recv or 0)

    rows = (
        q.join(BusinessPartner, BusinessPartner.partner_id == ARInvoice.partner_id)
        .filter(BusinessPartner.partner_type == "CUSTOMER")
        .with_entities(
            BusinessPartner.external_id,
            BusinessPartner.partner_name,
            func.coalesce(func.sum(ARInvoice.total_amount), 0).label("tong"),
            func.coalesce(func.sum(ARInvoice.received_amount), 0).label("da_thu"),
        )
        .group_by(BusinessPartner.external_id, BusinessPartner.partner_name)
        .order_by((func.sum(ARInvoice.total_amount) - func.sum(ARInvoice.received_amount)).desc())
        .limit(safe_limit(top, default=20, max_limit=100))
        .all()
    )

    top_rows = [{
        "external_id": r[0],
        "partner_name": r[1],
        "tong_phai_thu": to_str(r[2]),
        "da_thu": to_str(r[3]),
        "con_lai": to_str((r[2] or 0) - (r[3] or 0)),
    } for r in rows]

    ans = f"Công nợ phải thu đến {iso(as_of)}: Tổng {fmt_money(total)}, đã thu {fmt_money(recv)}, còn lại {fmt_money(out)}."
    return ok({"as_of": iso(as_of), "tong_phai_thu": to_str(total), "da_thu": to_str(recv), "con_lai": to_str(out), "top_doi_tac": top_rows},
              "Tổng hợp công nợ phải thu (AR).", answer=ans)


def ap_no(session: Session, external_id: Optional[str] = None, as_of: Optional[date] = None, top: int = 20):
    as_of = as_of or today()
    q = session.query(APInvoice).filter(APInvoice.invoice_date <= as_of)

    if external_id:
        bp = session.query(BusinessPartner).filter(
            BusinessPartner.partner_type == "SUPPLIER",
            BusinessPartner.external_id == external_id.strip()
        ).first()
        if not bp:
            return can_lam_ro("Không tìm thấy SUPPLIER theo external_id.", [])
        q = q.filter(APInvoice.partner_id == bp.partner_id)

    total = q.with_entities(func.coalesce(func.sum(APInvoice.total_amount), 0)).scalar() or 0
    paid = q.with_entities(func.coalesce(func.sum(APInvoice.paid_amount), 0)).scalar() or 0
    out = (total or 0) - (paid or 0)

    rows = (
        q.join(BusinessPartner, BusinessPartner.partner_id == APInvoice.partner_id)
        .filter(BusinessPartner.partner_type == "SUPPLIER")
        .with_entities(
            BusinessPartner.external_id,
            BusinessPartner.partner_name,
            func.coalesce(func.sum(APInvoice.total_amount), 0).label("tong"),
            func.coalesce(func.sum(APInvoice.paid_amount), 0).label("da_tra"),
        )
        .group_by(BusinessPartner.external_id, BusinessPartner.partner_name)
        .order_by((func.sum(APInvoice.total_amount) - func.sum(APInvoice.paid_amount)).desc())
        .limit(safe_limit(top, default=20, max_limit=100))
        .all()
    )

    top_rows = [{
        "external_id": r[0],
        "partner_name": r[1],
        "tong_phai_tra": to_str(r[2]),
        "da_tra": to_str(r[3]),
        "con_lai": to_str((r[2] or 0) - (r[3] or 0)),
    } for r in rows]

    ans = f"Công nợ phải trả đến {iso(as_of)}: Tổng {fmt_money(total)}, đã trả {fmt_money(paid)}, còn lại {fmt_money(out)}."
    return ok({"as_of": iso(as_of), "tong_phai_tra": to_str(total), "da_tra": to_str(paid), "con_lai": to_str(out), "top_doi_tac": top_rows},
              "Tổng hợp công nợ phải trả (AP).", answer=ans)


def cong_no_tong_hop(session: Session, as_of: Optional[date] = None):
    as_of = as_of or today()

    ar_total = session.query(func.coalesce(func.sum(ARInvoice.total_amount), 0)).filter(ARInvoice.invoice_date <= as_of).scalar() or 0
    ar_recv = session.query(func.coalesce(func.sum(ARInvoice.received_amount), 0)).filter(ARInvoice.invoice_date <= as_of).scalar() or 0
    ar_out = (ar_total or 0) - (ar_recv or 0)

    ap_total = session.query(func.coalesce(func.sum(APInvoice.total_amount), 0)).filter(APInvoice.invoice_date <= as_of).scalar() or 0
    ap_paid = session.query(func.coalesce(func.sum(APInvoice.paid_amount), 0)).filter(APInvoice.invoice_date <= as_of).scalar() or 0
    ap_out = (ap_total or 0) - (ap_paid or 0)

    ans = f"Đến {iso(as_of)}: Phải thu {fmt_money(ar_out)} | Phải trả {fmt_money(ap_out)}."
    return ok(
        {
            "as_of": iso(as_of),
            "ar_con_lai": to_str(ar_out),
            "ap_con_lai": to_str(ap_out),
            "net_receivable_minus_payable": to_str((ar_out or 0) - (ap_out or 0)),
        },
        "Tổng hợp công nợ toàn hệ thống.",
        answer=ans,
    )


def ar_cong_no_chi_tiet(session: Session, external_id: str, as_of: Optional[date] = None, limit: int = 30):
    as_of = as_of or today()
    ext = (external_id or "").strip()
    bp = session.query(BusinessPartner).filter(BusinessPartner.partner_type == "CUSTOMER", BusinessPartner.external_id == ext).first()
    if not bp:
        return can_lam_ro("Không tìm thấy CUSTOMER theo external_id.", [])

    q = (
        session.query(ARInvoice)
        .filter(ARInvoice.partner_id == bp.partner_id, ARInvoice.invoice_date <= as_of)
        .order_by(ARInvoice.due_date.asc().nulls_last(), ARInvoice.invoice_date.asc())
        .limit(safe_limit(limit, default=30, max_limit=200))
        .all()
    )

    rows = []
    for inv in q:
        total = inv.total_amount or 0
        recv = inv.received_amount or 0
        out = total - recv
        if out <= 0:
            continue
        rows.append({
            "invoice_id": inv.invoice_id,
            "sales_order_ref": inv.sales_order_ref,
            "invoice_date": iso(inv.invoice_date),
            "due_date": iso(inv.due_date),
            "payment_status": inv.payment_status,
            "total_amount": to_str(inv.total_amount),
            "received_amount": to_str(inv.received_amount),
            "outstanding": to_str(out),
            "entry_id": inv.entry_id,
        })

    return ok({"customer": {"external_id": bp.external_id, "partner_name": bp.partner_name}, "as_of": iso(as_of), "invoices": rows},
              "Chi tiết công nợ phải thu theo hóa đơn (chỉ các hóa đơn còn dư nợ).")


def ap_cong_no_chi_tiet(session: Session, external_id: str, as_of: Optional[date] = None, limit: int = 30):
    as_of = as_of or today()
    ext = (external_id or "").strip()
    bp = session.query(BusinessPartner).filter(BusinessPartner.partner_type == "SUPPLIER", BusinessPartner.external_id == ext).first()
    if not bp:
        return can_lam_ro("Không tìm thấy SUPPLIER theo external_id.", [])

    q = (
        session.query(APInvoice)
        .filter(APInvoice.partner_id == bp.partner_id, APInvoice.invoice_date <= as_of)
        .order_by(APInvoice.due_date.asc().nulls_last(), APInvoice.invoice_date.asc())
        .limit(safe_limit(limit, default=30, max_limit=200))
        .all()
    )

    rows = []
    for inv in q:
        total = inv.total_amount or 0
        paid = inv.paid_amount or 0
        out = total - paid
        if out <= 0:
            continue
        rows.append({
            "invoice_id": inv.invoice_id,
            "purchase_order_ref": inv.purchase_order_ref,
            "invoice_date": iso(inv.invoice_date),
            "due_date": iso(inv.due_date),
            "payment_status": inv.payment_status,
            "total_amount": to_str(inv.total_amount),
            "paid_amount": to_str(inv.paid_amount),
            "outstanding": to_str(out),
            "entry_id": inv.entry_id,
        })

    return ok({"supplier": {"external_id": bp.external_id, "partner_name": bp.partner_name}, "as_of": iso(as_of), "invoices": rows},
              "Chi tiết công nợ phải trả theo hóa đơn (chỉ các hóa đơn còn dư nợ).")


CONG_NO_TOOLS = [
    ToolSpec("ar_no", "Tổng hợp công nợ phải thu (AR).", ARCongNoArgs, ar_no, "finance_accounting"),
    ToolSpec("ap_no", "Tổng hợp công nợ phải trả (AP).", APCongNoArgs, ap_no, "finance_accounting"),
    ToolSpec("cong_no_tong_hop", "Tổng hợp công nợ phải thu/phải trả toàn hệ thống.", CongNoTongHopArgs, cong_no_tong_hop, "finance_accounting"),
    ToolSpec("ar_cong_no_chi_tiet", "Chi tiết công nợ phải thu theo hóa đơn của 1 khách hàng.", ARCongNoChiTietArgs, ar_cong_no_chi_tiet, "finance_accounting"),
    ToolSpec("ap_cong_no_chi_tiet", "Chi tiết công nợ phải trả theo hóa đơn của 1 nhà cung cấp.", APCongNoChiTietArgs, ap_cong_no_chi_tiet, "finance_accounting"),
]
