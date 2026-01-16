# app/modules/finance_accounting/tools/giai_thich.py
from __future__ import annotations
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok, can_lam_ro
from app.modules.finance_accounting.models import PostingRule, ChartOfAccounts


class GiaiThichRuleArgs(BaseModel):
    event_code: str


def giai_thich_rule(session: Session, event_code: str):
    code = (event_code or "").strip()
    if not code:
        return can_lam_ro("Bạn cung cấp event_code để giải thích quy tắc định khoản.", [])

    r = session.query(PostingRule).filter(PostingRule.event_code == code).first()
    if not r:
        return can_lam_ro("Không tìm thấy posting rule theo event_code.", [])

    debit = session.query(ChartOfAccounts).filter(ChartOfAccounts.account_id == r.debit_account_id).first()
    credit = session.query(ChartOfAccounts).filter(ChartOfAccounts.account_id == r.credit_account_id).first()

    return ok({
        "event_code": r.event_code,
        "event_description": r.event_description,
        "module_source": r.module_source,
        "debit": ({
            "account_id": debit.account_id,
            "account_code": debit.account_code,
            "account_name": debit.account_name,
            "account_type": debit.account_type,
        } if debit else None),
        "credit": ({
            "account_id": credit.account_id,
            "account_code": credit.account_code,
            "account_name": credit.account_name,
            "account_type": credit.account_type,
        } if credit else None),
        "dien_giai": f"Nợ {debit.account_code if debit else '?'} / Có {credit.account_code if credit else '?'} ({r.module_source})",
    }, "Giải thích quy tắc định khoản (read-only).")


GIAI_THICH_TOOLS = [
    ToolSpec("giai_thich_rule", "Giải thích quy tắc định khoản theo event_code.", GiaiThichRuleArgs, giai_thich_rule, "finance_accounting"),
]
