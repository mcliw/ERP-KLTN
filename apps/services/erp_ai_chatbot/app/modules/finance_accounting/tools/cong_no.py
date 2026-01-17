# app/modules/finance_accounting/tools/cong_no.py
from __future__ import annotations
from typing import Optional
from datetime import date
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.ai.tooling import ToolSpec, ok, can_lam_ro
from app.modules.finance_accounting.models import ARInvoice, APInvoice, BusinessPartner

def _iso(d): return d.isoformat() if d else None
def _to_str(x): return str(x) if x is not None else None


class ARCongNoArgs(BaseModel):
    external_id: Optional[str] = None   # theo đối tác (CUSTOMER)
    as_of: Optional[date] = None
    top: int = 20

class APCongNoArgs(BaseModel):
    external_id: Optional[str] = None   # theo đối tác (SUPPLIER)
    as_of: Optional[date] = None
    top: int = 20


from decimal import Decimal

def _fmt_money(x) -> str:
    if x is None:
        return "0"
    try:
        d = Decimal(str(x))
        return f"{d:,.0f}"
    except Exception:
        return str(x)

def ar_no(session: Session, external_id: Optional[str] = None, as_of: Optional[date] = None, top: int = 20):
    as_of = as_of or date.today()

    q_inv = session.query(ARInvoice).filter(ARInvoice.invoice_date <= as_of)

    bp = None
    if external_id:
        bp = session.query(BusinessPartner).filter(
            BusinessPartner.partner_type == "CUSTOMER",
            BusinessPartner.external_id == external_id.strip()
        ).first()
        if not bp:
            return can_lam_ro("Không tìm thấy CUSTOMER theo external_id.", [])
        q_inv = q_inv.filter(ARInvoice.partner_id == bp.partner_id)

    total = q_inv.with_entities(func.coalesce(func.sum(ARInvoice.total_amount), 0)).scalar() or 0
    recv  = q_inv.with_entities(func.coalesce(func.sum(ARInvoice.received_amount), 0)).scalar() or 0
    outstanding = (total or 0) - (recv or 0)

    rows = (
        q_inv
        .join(BusinessPartner, BusinessPartner.partner_id == ARInvoice.partner_id)
        .filter(BusinessPartner.partner_type == "CUSTOMER")
        .with_entities(
            BusinessPartner.external_id,
            BusinessPartner.partner_name,
            func.coalesce(func.sum(ARInvoice.total_amount), 0).label("tong"),
            func.coalesce(func.sum(ARInvoice.received_amount), 0).label("da_thu"),
        )
        .group_by(BusinessPartner.external_id, BusinessPartner.partner_name)
        .order_by((func.sum(ARInvoice.total_amount) - func.sum(ARInvoice.received_amount)).desc(),
                  BusinessPartner.external_id.asc())
        .limit(top)
        .all()
    )

    data_rows = [{
        "external_id": r[0],
        "partner_name": r[1],
        "tong_phai_thu": _to_str(r[2]),
        "da_thu": _to_str(r[3]),
        "con_lai": _to_str((r[2] or 0) - (r[3] or 0)),
    } for r in rows]

    # ✅ answer deterministic (để executor khỏi dùng fallback)
    ans = (
        f"Công nợ phải thu đến {_iso(as_of)}: "
        f"Tổng {_fmt_money(total)}, đã thu {_fmt_money(recv)}, còn lại {_fmt_money(outstanding)}."
    )

    return ok({
        "as_of": _iso(as_of),
        "tong_phai_thu": _to_str(total),
        "da_thu": _to_str(recv),
        "con_lai": _to_str(outstanding),
        "top_doi_tac": data_rows,
    }, "Tổng hợp công nợ phải thu (AR).", answer=ans)


def ap_no(session: Session, external_id: Optional[str] = None, as_of: Optional[date] = None, top: int = 20):
    as_of = as_of or date.today()

    q_inv = session.query(APInvoice).filter(APInvoice.invoice_date <= as_of)

    bp = None
    if external_id:
        bp = session.query(BusinessPartner).filter(
            BusinessPartner.partner_type == "SUPPLIER",
            BusinessPartner.external_id == external_id.strip()
        ).first()
        if not bp:
            return can_lam_ro("Không tìm thấy SUPPLIER theo external_id.", [])
        q_inv = q_inv.filter(APInvoice.partner_id == bp.partner_id)

    total = q_inv.with_entities(func.coalesce(func.sum(APInvoice.total_amount), 0)).scalar() or 0
    paid  = q_inv.with_entities(func.coalesce(func.sum(APInvoice.paid_amount), 0)).scalar() or 0
    outstanding = (total or 0) - (paid or 0)

    rows = (
        q_inv
        .join(BusinessPartner, BusinessPartner.partner_id == APInvoice.partner_id)
        .filter(BusinessPartner.partner_type == "SUPPLIER")
        .with_entities(
            BusinessPartner.external_id,
            BusinessPartner.partner_name,
            func.coalesce(func.sum(APInvoice.total_amount), 0).label("tong"),
            func.coalesce(func.sum(APInvoice.paid_amount), 0).label("da_tra"),
        )
        .group_by(BusinessPartner.external_id, BusinessPartner.partner_name)
        .order_by((func.sum(APInvoice.total_amount) - func.sum(APInvoice.paid_amount)).desc(),
                  BusinessPartner.external_id.asc())
        .limit(top)
        .all()
    )

    data_rows = [{
        "external_id": r[0],
        "partner_name": r[1],
        "tong_phai_tra": _to_str(r[2]),
        "da_tra": _to_str(r[3]),
        "con_lai": _to_str((r[2] or 0) - (r[3] or 0)),
    } for r in rows]

    ans = (
        f"Công nợ phải trả đến {_iso(as_of)}: "
        f"Tổng {_fmt_money(total)}, đã trả {_fmt_money(paid)}, còn lại {_fmt_money(outstanding)}."
    )

    return ok({
        "as_of": _iso(as_of),
        "tong_phai_tra": _to_str(total),
        "da_tra": _to_str(paid),
        "con_lai": _to_str(outstanding),
        "top_doi_tac": data_rows,
    }, "Tổng hợp công nợ phải trả (AP).", answer=ans)



CONG_NO_TOOLS = [
    ToolSpec("ar_no", "Tổng hợp công nợ phải thu (AR).", ARCongNoArgs, ar_no, "finance_accounting"),
    ToolSpec("ap_no", "Tổng hợp công nợ phải trả (AP).", APCongNoArgs, ap_no, "finance_accounting"),
]
