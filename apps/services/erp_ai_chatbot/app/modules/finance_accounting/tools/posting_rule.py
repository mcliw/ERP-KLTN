from __future__ import annotations

from typing import Optional

from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok, can_lam_ro
from app.modules.finance_accounting.models import PostingRule, ChartOfAccounts
from .helpers import norm_text, norm_code, candidates_by_prefix


class RuleDanhSachArgs(BaseModel):
    module_source: Optional[str] = None  # SALES/PURCHASE/CASH
    limit: int = 50


class RuleChiTietArgs(BaseModel):
    event_code: str


class RuleTimArgs(BaseModel):
    tu_khoa: str
    module_source: Optional[str] = None
    limit: int = 20


def rule_danh_sach(session: Session, module_source: Optional[str] = None, limit: int = 50):
    q = session.query(PostingRule)
    if module_source:
        q = q.filter(PostingRule.module_source == norm_code(module_source))

    rows = (
        q.order_by(PostingRule.event_code.asc())
        .limit(max(1, min(limit, 200)))
        .all()
    )

    return ok(
        [
            {
                "event_code": r.event_code,
                "event_description": r.event_description,
                "module_source": r.module_source,
                "debit_account_id": r.debit_account_id,
                "credit_account_id": r.credit_account_id,
            }
            for r in rows
        ],
        "Danh sách posting rules.",
    )


def rule_chi_tiet(session: Session, event_code: str):
    code = norm_text(event_code)
    r = session.query(PostingRule).filter(PostingRule.event_code == code).first()
    if not r:
        cands = candidates_by_prefix(session, PostingRule, "event_code", code, limit=10)
        if cands:
            return can_lam_ro(f"Không tìm thấy rule '{event_code}'. Bạn muốn chọn mã nào?", cands)
        return can_lam_ro("Không tìm thấy posting rule.", [])

    debit = session.query(ChartOfAccounts).filter(ChartOfAccounts.account_id == r.debit_account_id).first() if r.debit_account_id else None
    credit = session.query(ChartOfAccounts).filter(ChartOfAccounts.account_id == r.credit_account_id).first() if r.credit_account_id else None

    return ok(
        {
            "rule_id": r.rule_id,
            "event_code": r.event_code,
            "event_description": r.event_description,
            "module_source": r.module_source,
            "debit": {
                "account_id": debit.account_id,
                "account_code": debit.account_code,
                "account_name": debit.account_name,
                "account_type": debit.account_type,
            }
            if debit
            else None,
            "credit": {
                "account_id": credit.account_id,
                "account_code": credit.account_code,
                "account_name": credit.account_name,
                "account_type": credit.account_type,
            }
            if credit
            else None,
        },
        "Chi tiết posting rule.",
    )


def rule_giai_thich(session: Session, event_code: str):
    res = rule_chi_tiet(session, event_code)
    if not res.get("ok"):
        return res

    data = res.get("data") or {}
    debit = data.get("debit")
    credit = data.get("credit")

    ans = (
        f"Rule {data.get('event_code')}: {data.get('event_description') or ''}. "
        f"Gợi ý hạch toán: Nợ {debit.get('account_code') if debit else '?'}"
        f" / Có {credit.get('account_code') if credit else '?'}."
    ).strip()

    return ok(data, "Giải thích posting rule.", answer=ans)


def rule_tim(session: Session, tu_khoa: str, module_source: Optional[str] = None, limit: int = 20):
    kw = norm_text(tu_khoa)
    if not kw:
        return can_lam_ro("Thiếu từ khóa rule.", [])

    q = session.query(PostingRule)
    if module_source:
        q = q.filter(PostingRule.module_source == norm_code(module_source))

    like = f"%{kw}%"
    rows = (
        q.filter(
            func.lower(PostingRule.event_code).like(func.lower(like))
            | func.lower(PostingRule.event_description).like(func.lower(like))
        )
        .order_by(PostingRule.event_code.asc())
        .limit(max(1, min(limit, 200)))
        .all()
    )

    return ok(
        [
            {
                "event_code": r.event_code,
                "event_description": r.event_description,
                "module_source": r.module_source,
                "debit_account_id": r.debit_account_id,
                "credit_account_id": r.credit_account_id,
            }
            for r in rows
        ],
        "Danh sách posting rules phù hợp.",
    )


POSTING_RULE_TOOLS = [
    ToolSpec("rule_danh_sach", "Danh sách posting rules (lọc module_source).", RuleDanhSachArgs, rule_danh_sach, "finance_accounting"),
    ToolSpec("rule_tim", "Tìm posting rule theo từ khóa.", RuleTimArgs, rule_tim, "finance_accounting"),
    ToolSpec("rule_chi_tiet", "Chi tiết posting rule theo event_code.", RuleChiTietArgs, rule_chi_tiet, "finance_accounting"),
    ToolSpec("rule_giai_thich", "Giải thích posting rule theo event_code.", RuleChiTietArgs, rule_giai_thich, "finance_accounting"),
]
