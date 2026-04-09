from __future__ import annotations

from datetime import date, timedelta
from typing import Optional

from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok, can_lam_ro
from app.modules.finance_accounting.models import CashTransaction, JournalEntry
from .helpers import norm_text, norm_code, iso_date, to_str, fmt_money, candidates_by_prefix, require_any


class CashChiTietArgs(BaseModel):
    transaction_id: Optional[int] = None
    reference_doc_id: Optional[str] = None


class CashLichSuArgs(BaseModel):
    from_date: Optional[date] = None
    to_date: Optional[date] = None
    transaction_type: Optional[str] = None  # RECEIPT/PAYMENT
    payment_method: Optional[str] = None    # CASH/BANK_TRANSFER
    limit: int = 20


class CashTongHopThangArgs(BaseModel):
    month: int
    year: int


class CashGanNhatArgs(BaseModel):
    days: int = 7
    limit: int = 20


def cash_chi_tiet(session: Session, transaction_id: Optional[int] = None, reference_doc_id: Optional[str] = None):
    missing = require_any(transaction_id=transaction_id, reference_doc_id=reference_doc_id)
    if missing:
        return missing

    q = session.query(CashTransaction)
    if transaction_id:
        tx = q.filter(CashTransaction.transaction_id == transaction_id).first()
    else:
        ref = norm_text(reference_doc_id)
        tx = q.filter(CashTransaction.reference_doc_id == ref).first()
        if not tx and ref:
            # gợi ý prefix
            cands = candidates_by_prefix(session, CashTransaction, "reference_doc_id", ref, limit=10)
            if cands:
                return can_lam_ro(f"Không tìm thấy giao dịch '{reference_doc_id}'. Bạn muốn chọn mã nào?", cands)

    if not tx:
        return can_lam_ro("Không tìm thấy giao dịch thu/chi.", [])

    je = session.query(JournalEntry).filter(JournalEntry.entry_id == tx.entry_id).first() if tx.entry_id else None

    return ok(
        {
            "transaction_id": tx.transaction_id,
            "transaction_type": tx.transaction_type,
            "amount": to_str(tx.amount),
            "payment_method": tx.payment_method,
            "bank_account_number": tx.bank_account_number,
            "reference_doc_id": tx.reference_doc_id,
            "created_at": tx.created_at.isoformat() if tx.created_at else None,
            "journal_entry": {
                "entry_id": je.entry_id if je else tx.entry_id,
                "reference_no": je.reference_no if je else None,
                "transaction_date": iso_date(je.transaction_date) if je else None,
                "status": je.status if je else None,
            }
            if (je or tx.entry_id)
            else None,
        },
        "Chi tiết giao dịch thu/chi.",
    )


def cash_lich_su(
    session: Session,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    transaction_type: Optional[str] = None,
    payment_method: Optional[str] = None,
    limit: int = 20,
):
    q = session.query(CashTransaction)

    if from_date:
        q = q.filter(func.date(CashTransaction.created_at) >= from_date)
    if to_date:
        q = q.filter(func.date(CashTransaction.created_at) <= to_date)

    if transaction_type:
        q = q.filter(CashTransaction.transaction_type == norm_code(transaction_type))
    if payment_method:
        q = q.filter(CashTransaction.payment_method == norm_code(payment_method))

    rows = (
        q.order_by(CashTransaction.created_at.desc(), CashTransaction.transaction_id.desc())
        .limit(max(1, min(limit, 200)))
        .all()
    )

    data = [
        {
            "transaction_id": r.transaction_id,
            "transaction_type": r.transaction_type,
            "amount": to_str(r.amount),
            "payment_method": r.payment_method,
            "reference_doc_id": r.reference_doc_id,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "entry_id": r.entry_id,
        }
        for r in rows
    ]

    return ok(data, "Lịch sử thu/chi.")


def cash_tong_hop_thang(session: Session, month: int, year: int):
    if not (1 <= int(month) <= 12):
        return can_lam_ro("Month không hợp lệ (1-12).", [])

    m = int(month)
    y = int(year)
    start = date(y, m, 1)
    # end = ngày 1 của tháng kế tiếp (lọc < end)
    end = date(y + 1, 1, 1) if m == 12 else date(y, m + 1, 1)

    recv = (
        session.query(func.coalesce(func.sum(CashTransaction.amount), 0))
        .filter(CashTransaction.transaction_type == "RECEIPT")
        .filter(CashTransaction.created_at >= start)
        .filter(CashTransaction.created_at < end)
        .scalar()
        or 0
    )
    pay = (
        session.query(func.coalesce(func.sum(CashTransaction.amount), 0))
        .filter(CashTransaction.transaction_type == "PAYMENT")
        .filter(CashTransaction.created_at >= start)
        .filter(CashTransaction.created_at < end)
        .scalar()
        or 0
    )
    net = (recv or 0) - (pay or 0)

    ans = (
        f"Thu/chi {month:02d}/{year}: Thu {fmt_money(recv)}, Chi {fmt_money(pay)}, "
        f"Dòng tiền {('dương' if net >= 0 else 'âm')} {fmt_money(net)}."
    )

    return ok(
        {
            "month": m,
            "year": y,
            "total_receipt": to_str(recv),
            "total_payment": to_str(pay),
            "net_cash_flow": to_str(net),
        },
        "Tổng hợp thu/chi theo tháng.",
        answer=ans,
    )


def cash_gan_nhat(session: Session, days: int = 7, limit: int = 20):
    days = max(1, min(int(days or 7), 90))
    since = date.today() - timedelta(days=days)

    rows = (
        session.query(CashTransaction)
        .filter(func.date(CashTransaction.created_at) >= since)
        .order_by(CashTransaction.created_at.desc())
        .limit(max(1, min(limit, 200)))
        .all()
    )

    return ok(
        {
            "since": since.isoformat(),
            "days": days,
            "rows": [
                {
                    "transaction_id": r.transaction_id,
                    "transaction_type": r.transaction_type,
                    "amount": to_str(r.amount),
                    "payment_method": r.payment_method,
                    "reference_doc_id": r.reference_doc_id,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                    "entry_id": r.entry_id,
                }
                for r in rows
            ],
        },
        "Danh sách giao dịch thu/chi gần đây.",
    )


THU_CHI_TOOLS = [
    ToolSpec("cash_chi_tiet", "Chi tiết giao dịch thu/chi theo transaction_id hoặc reference_doc_id.", CashChiTietArgs, cash_chi_tiet, "finance_accounting"),
    ToolSpec("cash_lich_su", "Lịch sử thu/chi theo khoảng ngày/loại/phương thức.", CashLichSuArgs, cash_lich_su, "finance_accounting"),
    ToolSpec("cash_tong_hop_thang", "Tổng thu, tổng chi, dòng tiền theo tháng.", CashTongHopThangArgs, cash_tong_hop_thang, "finance_accounting"),
    ToolSpec("cash_gan_nhat", "Danh sách giao dịch thu/chi gần đây (N ngày).", CashGanNhatArgs, cash_gan_nhat, "finance_accounting"),
]
