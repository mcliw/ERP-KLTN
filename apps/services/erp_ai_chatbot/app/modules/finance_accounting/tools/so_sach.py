# app/modules/finance_accounting/tools/so_sach.py
from __future__ import annotations
from typing import Optional
from datetime import date
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy import and_

from app.ai.tooling import ToolSpec, ok, can_lam_ro
from app.modules.finance_accounting.models import (
    JournalEntry, JournalEntryLine, ChartOfAccounts, BusinessPartner, FiscalPeriod
)

def _iso(d): return d.isoformat() if d else None
def _to_str(x): return str(x) if x is not None else None


class SoNhatKyArgs(BaseModel):
    tu_ngay: Optional[date] = None
    den_ngay: Optional[date] = None
    status: Optional[str] = None         # DRAFT/POSTED
    source_module: Optional[str] = None  # SALES/PURCHASE/CASH/MANUAL
    limit: int = 50


def so_nhat_ky(session: Session, tu_ngay: Optional[date] = None, den_ngay: Optional[date] = None,
              status: Optional[str] = None, source_module: Optional[str] = None, limit: int = 50):

    q = session.query(JournalEntry)

    if tu_ngay:
        q = q.filter(JournalEntry.transaction_date >= tu_ngay)
    if den_ngay:
        q = q.filter(JournalEntry.transaction_date <= den_ngay)
    if status:
        q = q.filter(JournalEntry.status == status)
    if source_module:
        q = q.filter(JournalEntry.source_module == source_module)

    rows = q.order_by(JournalEntry.transaction_date.desc().nullslast(), JournalEntry.entry_id.desc()).limit(limit).all()

    data = [{
        "entry_id": r.entry_id,
        "transaction_date": _iso(r.transaction_date),
        "posting_date": _iso(r.posting_date),
        "reference_no": r.reference_no,
        "source_module": r.source_module,
        "status": r.status,
        "total_amount": _to_str(r.total_amount),
        "fiscal_period_id": r.fiscal_period_id,
        "description": r.description,
    } for r in rows]

    return ok(data, "Sổ nhật ký (journal_entries).")


class ButToanArgs(BaseModel):
    entry_id: Optional[int] = None
    reference_no: Optional[str] = None


def but_toan(session: Session, entry_id: Optional[int] = None, reference_no: Optional[str] = None):
    entry = None
    if entry_id:
        entry = session.query(JournalEntry).filter(JournalEntry.entry_id == entry_id).first()
    elif reference_no:
        entry = session.query(JournalEntry).filter(JournalEntry.reference_no == reference_no.strip()).order_by(JournalEntry.entry_id.desc()).first()
    else:
        return can_lam_ro("Bạn cung cấp entry_id hoặc reference_no để xem chi tiết bút toán.", [])

    if not entry:
        return can_lam_ro("Không tìm thấy bút toán.", [])

    rows = (
        session.query(JournalEntryLine, ChartOfAccounts, BusinessPartner)
        .join(ChartOfAccounts, ChartOfAccounts.account_id == JournalEntryLine.account_id)
        .outerjoin(BusinessPartner, BusinessPartner.partner_id == JournalEntryLine.partner_id)
        .filter(JournalEntryLine.entry_id == entry.entry_id)
        .all()
    )

    lines = []
    total_debit = 0
    total_credit = 0
    for l, acc, bp in rows:
        d = float(l.debit_amount or 0)
        c = float(l.credit_amount or 0)
        total_debit += d
        total_credit += c
        lines.append({
            "account_code": acc.account_code,
            "account_name": acc.account_name,
            "debit_amount": _to_str(l.debit_amount),
            "credit_amount": _to_str(l.credit_amount),
            "partner": ({"partner_type": bp.partner_type, "external_id": bp.external_id, "partner_name": bp.partner_name} if bp else None),
            "description": l.description,
        })

    return ok({
        "entry_id": entry.entry_id,
        "transaction_date": _iso(entry.transaction_date),
        "posting_date": _iso(entry.posting_date),
        "reference_no": entry.reference_no,
        "source_module": entry.source_module,
        "status": entry.status,
        "description": entry.description,
        "total_debit": _to_str(total_debit),
        "total_credit": _to_str(total_credit),
        "is_balanced": abs(total_debit - total_credit) < 0.0001,
        "lines": lines,
    }, "Chi tiết bút toán (journal_entry_lines).")


class SoDuArgs(BaseModel):
    account_code: Optional[str] = None
    fiscal_period_id: Optional[int] = None
    tu_ngay: Optional[date] = None
    den_ngay: Optional[date] = None
    limit: int = 50


def so_du(session: Session, account_code: Optional[str] = None, fiscal_period_id: Optional[int] = None,
          tu_ngay: Optional[date] = None, den_ngay: Optional[date] = None, limit: int = 50):

    if fiscal_period_id and (not tu_ngay and not den_ngay):
        p = session.query(FiscalPeriod).filter(FiscalPeriod.period_id == fiscal_period_id).first()
        if p:
            tu_ngay, den_ngay = p.start_date, p.end_date

    q = (
        session.query(
            ChartOfAccounts.account_code,
            ChartOfAccounts.account_name,
            func.coalesce(func.sum(JournalEntryLine.debit_amount), 0).label("debit"),
            func.coalesce(func.sum(JournalEntryLine.credit_amount), 0).label("credit"),
        )
        .join(JournalEntryLine, JournalEntryLine.account_id == ChartOfAccounts.account_id)
        .join(JournalEntry, JournalEntry.entry_id == JournalEntryLine.entry_id)
    )

    if tu_ngay:
        q = q.filter(JournalEntry.transaction_date >= tu_ngay)
    if den_ngay:
        q = q.filter(JournalEntry.transaction_date <= den_ngay)

    if account_code:
        q = q.filter(ChartOfAccounts.account_code == account_code.strip())
        q = q.group_by(ChartOfAccounts.account_code, ChartOfAccounts.account_name)
        r = q.first()
        if not r:
            return can_lam_ro("Không có phát sinh cho tài khoản này trong khoảng thời gian.", [])
        debit = float(r[2] or 0)
        credit = float(r[3] or 0)
        return ok({
            "account_code": r[0],
            "account_name": r[1],
            "tu_ngay": _iso(tu_ngay),
            "den_ngay": _iso(den_ngay),
            "debit": _to_str(r[2]),
            "credit": _to_str(r[3]),
            "balance": _to_str(debit - credit),
        }, "Số dư tài khoản (debit - credit).")

    q = (
        q.group_by(ChartOfAccounts.account_code, ChartOfAccounts.account_name)
         .order_by((func.sum(JournalEntryLine.debit_amount) - func.sum(JournalEntryLine.credit_amount)).desc())
         .limit(limit)
    )

    rows = q.all()
    data = []
    for code, name, debit, credit in rows:
        bal = float(debit or 0) - float(credit or 0)
        data.append({
            "account_code": code,
            "account_name": name,
            "debit": _to_str(debit),
            "credit": _to_str(credit),
            "balance": _to_str(bal),
        })

    return ok({
        "tu_ngay": _iso(tu_ngay),
        "den_ngay": _iso(den_ngay),
        "rows": data,
    }, "Số dư nhiều tài khoản (top).")


SO_SACH_TOOLS = [
    ToolSpec("so_nhat_ky", "Tra sổ nhật ký (journal_entries).", SoNhatKyArgs, so_nhat_ky, "finance_accounting"),
    ToolSpec("but_toan", "Tra chi tiết bút toán theo entry_id/reference_no.", ButToanArgs, but_toan, "finance_accounting"),
    ToolSpec("so_du", "Tra số dư (debit-credit) theo tài khoản hoặc top nhiều tài khoản.", SoDuArgs, so_du, "finance_accounting"),
]
