from __future__ import annotations

from datetime import date
from typing import Optional

from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok, can_lam_ro
from app.modules.finance_accounting.models import (
    JournalEntry, JournalEntryLine, ChartOfAccounts, BusinessPartner,
    ARInvoice, APInvoice, CashTransaction,
)
from .helpers import norm_text, norm_code, iso_date, to_str, fmt_money, candidates_by_prefix, require_any


# ============== JOURNAL ENTRY LIST / DETAIL ==============
class JEDanhSachArgs(BaseModel):
    from_date: Optional[date] = None
    to_date: Optional[date] = None
    status: Optional[str] = None  # DRAFT/POSTED
    source_module: Optional[str] = None  # SALES/PURCHASE/CASH/MANUAL
    reference_prefix: Optional[str] = None
    limit: int = 20


class JEChiTietArgs(BaseModel):
    entry_id: Optional[int] = None
    reference_no: Optional[str] = None


class JENhoTheoChungTuArgs(BaseModel):
    doc_type: str  # AR/AP/CASH
    doc_id: Optional[int] = None
    ref: Optional[str] = None


# ============== ACCOUNT BALANCE / LEDGER ==============
class SoDuTaiKhoanArgs(BaseModel):
    account_code: str
    from_date: Optional[date] = None
    to_date: Optional[date] = None
    posted_only: bool = True


class SoCaiTaiKhoanArgs(BaseModel):
    account_code: str
    from_date: Optional[date] = None
    to_date: Optional[date] = None
    posted_only: bool = True
    limit: int = 200


def _find_entry(session: Session, entry_id: Optional[int], reference_no: Optional[str]):
    if entry_id:
        return session.query(JournalEntry).filter(JournalEntry.entry_id == entry_id).first()
    if reference_no:
        ref = norm_text(reference_no)
        return session.query(JournalEntry).filter(JournalEntry.reference_no == ref).first()
    return None


def je_danh_sach(
    session: Session,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    status: Optional[str] = None,
    source_module: Optional[str] = None,
    reference_prefix: Optional[str] = None,
    limit: int = 20,
):
    q = session.query(JournalEntry)

    if from_date:
        q = q.filter(JournalEntry.transaction_date >= from_date)
    if to_date:
        q = q.filter(JournalEntry.transaction_date <= to_date)

    if status:
        q = q.filter(JournalEntry.status == norm_code(status))

    if source_module:
        q = q.filter(JournalEntry.source_module == norm_code(source_module))

    if reference_prefix:
        pref = norm_code(reference_prefix)
        q = q.filter(func.upper(JournalEntry.reference_no).like(pref + "%"))

    rows = (
        q.order_by(JournalEntry.transaction_date.desc(), JournalEntry.entry_id.desc())
        .limit(max(1, min(limit, 200)))
        .all()
    )

    return ok(
        [
            {
                "entry_id": r.entry_id,
                "transaction_date": iso_date(r.transaction_date),
                "reference_no": r.reference_no,
                "source_module": r.source_module,
                "status": r.status,
                "total_amount": to_str(r.total_amount),
                "description": r.description,
                "fiscal_period_id": r.fiscal_period_id,
            }
            for r in rows
        ],
        "Danh sách bút toán (Journal Entries).",
    )


def je_chi_tiet(session: Session, entry_id: Optional[int] = None, reference_no: Optional[str] = None):
    missing = require_any(entry_id=entry_id, reference_no=reference_no)
    if missing:
        return missing

    je = _find_entry(session, entry_id, reference_no)
    if not je:
        cands = candidates_by_prefix(session, JournalEntry, "reference_no", reference_no or "", limit=10) if reference_no else []
        if cands:
            return can_lam_ro(f"Không tìm thấy bút toán '{reference_no}'. Bạn muốn chọn mã nào?", cands)
        return can_lam_ro("Không tìm thấy bút toán.", [])

    lines = (
        session.query(JournalEntryLine, ChartOfAccounts, BusinessPartner)
        .join(ChartOfAccounts, ChartOfAccounts.account_id == JournalEntryLine.account_id)
        .outerjoin(BusinessPartner, BusinessPartner.partner_id == JournalEntryLine.partner_id)
        .filter(JournalEntryLine.entry_id == je.entry_id)
        .order_by(JournalEntryLine.line_id.asc())
        .all()
    )

    line_rows = []
    for line, acc, bp in lines:
        line_rows.append(
            {
                "line_id": line.line_id,
                "account_code": acc.account_code if acc else None,
                "account_name": acc.account_name if acc else None,
                "debit_amount": to_str(line.debit_amount),
                "credit_amount": to_str(line.credit_amount),
                "partner": {
                    "partner_type": bp.partner_type,
                    "external_id": bp.external_id,
                    "partner_name": bp.partner_name,
                }
                if bp
                else None,
                "description": line.description,
            }
        )

    total_debit = sum((l.debit_amount or 0) for l, _, _ in lines) if lines else 0
    total_credit = sum((l.credit_amount or 0) for l, _, _ in lines) if lines else 0

    ans = (
        f"Bút toán {je.reference_no or je.entry_id}: {je.status}. "
        f"Nợ {fmt_money(total_debit)} / Có {fmt_money(total_credit)} (ngày {iso_date(je.transaction_date)})."
    )

    return ok(
        {
            "entry_id": je.entry_id,
            "reference_no": je.reference_no,
            "transaction_date": iso_date(je.transaction_date),
            "posting_date": je.posting_date.isoformat() if je.posting_date else None,
            "description": je.description,
            "source_module": je.source_module,
            "status": je.status,
            "fiscal_period_id": je.fiscal_period_id,
            "total_amount": to_str(je.total_amount),
            "total_debit": to_str(total_debit),
            "total_credit": to_str(total_credit),
            "lines": line_rows,
        },
        "Chi tiết bút toán (Journal Entry).",
        answer=ans,
    )


def je_theo_chung_tu(session: Session, doc_type: str, doc_id: Optional[int] = None, ref: Optional[str] = None):
    dt = norm_code(doc_type)
    missing = require_any(doc_id=doc_id, ref=ref)
    if missing:
        return missing

    entry_id = None

    if dt == "AR":
        inv = None
        if doc_id:
            inv = session.query(ARInvoice).filter(ARInvoice.invoice_id == doc_id).first()
        if not inv and ref:
            inv = session.query(ARInvoice).filter(ARInvoice.sales_order_ref == norm_text(ref)).first()
        if not inv:
            return can_lam_ro("Không tìm thấy AR invoice để lấy bút toán.", [])
        entry_id = inv.entry_id

    elif dt == "AP":
        inv = None
        if doc_id:
            inv = session.query(APInvoice).filter(APInvoice.invoice_id == doc_id).first()
        if not inv and ref:
            inv = session.query(APInvoice).filter(APInvoice.purchase_order_ref == norm_text(ref)).first()
        if not inv:
            return can_lam_ro("Không tìm thấy AP invoice để lấy bút toán.", [])
        entry_id = inv.entry_id

    elif dt == "CASH":
        tx = None
        if doc_id:
            tx = session.query(CashTransaction).filter(CashTransaction.transaction_id == doc_id).first()
        if not tx and ref:
            tx = session.query(CashTransaction).filter(CashTransaction.reference_doc_id == norm_text(ref)).first()
        if not tx:
            return can_lam_ro("Không tìm thấy cash transaction để lấy bút toán.", [])
        entry_id = tx.entry_id

    else:
        return can_lam_ro("doc_type không hợp lệ. Chỉ nhận AR/AP/CASH.", [])

    if not entry_id:
        return ok(None, "Chứng từ chưa có liên kết bút toán (entry_id null).")

    # tái dùng logic je_chi_tiet
    return je_chi_tiet(session, entry_id=entry_id, reference_no=None)


def so_du_tai_khoan(
    session: Session,
    account_code: str,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    posted_only: bool = True,
):
    code = norm_text(account_code)
    acc = session.query(ChartOfAccounts).filter(ChartOfAccounts.account_code == code).first()
    if not acc:
        cands = candidates_by_prefix(session, ChartOfAccounts, "account_code", code, limit=10)
        if cands:
            return can_lam_ro(f"Không tìm thấy account_code '{account_code}'. Bạn muốn chọn mã nào?", cands)
        return can_lam_ro("Không tìm thấy tài khoản kế toán.", [])

    q = (
        session.query(JournalEntryLine)
        .join(JournalEntry, JournalEntry.entry_id == JournalEntryLine.entry_id)
        .filter(JournalEntryLine.account_id == acc.account_id)
    )

    if posted_only:
        q = q.filter(JournalEntry.status == "POSTED")

    if from_date:
        q = q.filter(JournalEntry.transaction_date >= from_date)
    if to_date:
        q = q.filter(JournalEntry.transaction_date <= to_date)

    debit = q.with_entities(func.coalesce(func.sum(JournalEntryLine.debit_amount), 0)).scalar() or 0
    credit = q.with_entities(func.coalesce(func.sum(JournalEntryLine.credit_amount), 0)).scalar() or 0
    net = (debit or 0) - (credit or 0)

    ans = (
        f"Số phát sinh TK {acc.account_code} ({acc.account_name}): "
        f"Nợ {fmt_money(debit)} / Có {fmt_money(credit)}. Net {fmt_money(net)}."
    )

    return ok(
        {
            "account_code": acc.account_code,
            "account_name": acc.account_name,
            "account_type": acc.account_type,
            "from_date": from_date.isoformat() if from_date else None,
            "to_date": to_date.isoformat() if to_date else None,
            "posted_only": bool(posted_only),
            "debit_total": to_str(debit),
            "credit_total": to_str(credit),
            "net_debit_minus_credit": to_str(net),
        },
        "Số dư/phát sinh tài khoản kế toán.",
        answer=ans,
    )


def so_cai_tai_khoan(
    session: Session,
    account_code: str,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    posted_only: bool = True,
    limit: int = 200,
):
    code = norm_text(account_code)
    acc = session.query(ChartOfAccounts).filter(ChartOfAccounts.account_code == code).first()
    if not acc:
        cands = candidates_by_prefix(session, ChartOfAccounts, "account_code", code, limit=10)
        if cands:
            return can_lam_ro(f"Không tìm thấy account_code '{account_code}'. Bạn muốn chọn mã nào?", cands)
        return can_lam_ro("Không tìm thấy tài khoản kế toán.", [])

    q = (
        session.query(JournalEntryLine, JournalEntry, BusinessPartner)
        .join(JournalEntry, JournalEntry.entry_id == JournalEntryLine.entry_id)
        .outerjoin(BusinessPartner, BusinessPartner.partner_id == JournalEntryLine.partner_id)
        .filter(JournalEntryLine.account_id == acc.account_id)
    )

    if posted_only:
        q = q.filter(JournalEntry.status == "POSTED")

    if from_date:
        q = q.filter(JournalEntry.transaction_date >= from_date)
    if to_date:
        q = q.filter(JournalEntry.transaction_date <= to_date)

    rows = (
        q.order_by(JournalEntry.transaction_date.desc(), JournalEntryLine.line_id.desc())
        .limit(max(1, min(limit, 500)))
        .all()
    )

    return ok(
        {
            "account_code": acc.account_code,
            "account_name": acc.account_name,
            "rows": [
                {
                    "entry_id": je.entry_id,
                    "reference_no": je.reference_no,
                    "transaction_date": iso_date(je.transaction_date),
                    "status": je.status,
                    "debit_amount": to_str(line.debit_amount),
                    "credit_amount": to_str(line.credit_amount),
                    "partner": {
                        "external_id": bp.external_id,
                        "partner_name": bp.partner_name,
                        "partner_type": bp.partner_type,
                    }
                    if bp
                    else None,
                    "line_desc": line.description,
                }
                for (line, je, bp) in rows
            ],
        },
        "Sổ cái theo tài khoản.",
    )


SO_KE_TOAN_TOOLS = [
    ToolSpec("je_danh_sach", "Danh sách bút toán (journal entries).", JEDanhSachArgs, je_danh_sach, "finance_accounting"),
    ToolSpec("je_chi_tiet", "Chi tiết bút toán theo entry_id hoặc reference_no.", JEChiTietArgs, je_chi_tiet, "finance_accounting"),
    ToolSpec("je_theo_chung_tu", "Lấy bút toán theo chứng từ AR/AP/CASH.", JENhoTheoChungTuArgs, je_theo_chung_tu, "finance_accounting"),
    ToolSpec("so_du_tk", "Tính phát sinh Nợ/Có của 1 tài khoản trong khoảng ngày.", SoDuTaiKhoanArgs, so_du_tai_khoan, "finance_accounting"),
    ToolSpec("so_cai_tk", "Sổ cái của 1 tài khoản (danh sách dòng hạch toán).", SoCaiTaiKhoanArgs, so_cai_tai_khoan, "finance_accounting"),
]
