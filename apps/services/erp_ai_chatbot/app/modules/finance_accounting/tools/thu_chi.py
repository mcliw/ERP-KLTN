# app/modules/finance_accounting/tools/thu_chi.py
from __future__ import annotations
from typing import Optional
from datetime import date, datetime
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.ai.tooling import ToolSpec, ok
from app.modules.finance_accounting.models import CashTransaction

def _iso(d): return d.isoformat() if d else None
def _to_str(x): return str(x) if x is not None else None


class GiaoDichArgs(BaseModel):
    loai: Optional[str] = None           # RECEIPT/PAYMENT
    phuong_thuc: Optional[str] = None    # CASH/BANK_TRANSFER
    tu_ngay: Optional[date] = None
    den_ngay: Optional[date] = None
    reference_doc_id: Optional[str] = None
    limit: int = 50


def giao_dich(session: Session, loai: Optional[str] = None, phuong_thuc: Optional[str] = None,
             tu_ngay: Optional[date] = None, den_ngay: Optional[date] = None,
             reference_doc_id: Optional[str] = None, limit: int = 50):

    q = session.query(CashTransaction)

    if loai:
        q = q.filter(CashTransaction.transaction_type == loai)
    if phuong_thuc:
        q = q.filter(CashTransaction.payment_method == phuong_thuc)
    if reference_doc_id:
        q = q.filter(CashTransaction.reference_doc_id == reference_doc_id.strip())

    if tu_ngay:
        q = q.filter(CashTransaction.created_at >= datetime.combine(tu_ngay, datetime.min.time()))
    if den_ngay:
        q = q.filter(CashTransaction.created_at <= datetime.combine(den_ngay, datetime.max.time()))

    rows = q.order_by(CashTransaction.created_at.desc()).limit(limit).all()

    data = [{
        "transaction_id": r.transaction_id,
        "transaction_type": r.transaction_type,
        "amount": _to_str(r.amount),
        "payment_method": r.payment_method,
        "bank_account_number": r.bank_account_number,
        "reference_doc_id": r.reference_doc_id,
        "entry_id": r.entry_id,
        "created_at": _iso(r.created_at),
    } for r in rows]

    return ok(data, "Danh sách giao dịch thu/chi.")


class DongTienArgs(BaseModel):
    tu_ngay: Optional[date] = None
    den_ngay: Optional[date] = None


def dong_tien(session: Session, tu_ngay: Optional[date] = None, den_ngay: Optional[date] = None):
    q = session.query(CashTransaction)

    if tu_ngay:
        q = q.filter(CashTransaction.created_at >= datetime.combine(tu_ngay, datetime.min.time()))
    if den_ngay:
        q = q.filter(CashTransaction.created_at <= datetime.combine(den_ngay, datetime.max.time()))

    thu = session.query(func.coalesce(func.sum(CashTransaction.amount), 0)).filter(
        CashTransaction.transaction_type == "RECEIPT"
    ).scalar() or 0

    chi = session.query(func.coalesce(func.sum(CashTransaction.amount), 0)).filter(
        CashTransaction.transaction_type == "PAYMENT"
    ).scalar() or 0

    return ok({
        "tu_ngay": _iso(tu_ngay),
        "den_ngay": _iso(den_ngay),
        "tong_thu": _to_str(thu),
        "tong_chi": _to_str(chi),
        "net": _to_str((thu or 0) - (chi or 0)),
    }, "Tổng hợp dòng tiền (thu/chi/net).")


THU_CHI_TOOLS = [
    ToolSpec("giao_dich", "Tra giao dịch thu/chi (cash_transactions).", GiaoDichArgs, giao_dich, "finance_accounting"),
    ToolSpec("dong_tien", "Tổng hợp dòng tiền theo khoảng ngày.", DongTienArgs, dong_tien, "finance_accounting"),
]
