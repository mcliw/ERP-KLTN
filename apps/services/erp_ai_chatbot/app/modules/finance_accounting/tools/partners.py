from __future__ import annotations
from typing import Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app.ai.tooling import ToolSpec, ok, can_lam_ro
from app.modules.finance_accounting.models import BusinessPartner


def _candidates_by_prefix(session: Session, prefix: str, limit: int = 5) -> list[str]:
    if not prefix:
        return []
    rows = (
        session.query(BusinessPartner.partner_code)
        .filter(func.upper(BusinessPartner.partner_code).like(prefix.upper() + "%"))
        .order_by(BusinessPartner.partner_code.asc())
        .limit(limit)
        .all()
    )
    return [r[0] for r in rows]


class TimDoiTacArgs(BaseModel):
    tu_khoa: str
    limit: int = 10


def tim_doi_tac(session: Session, tu_khoa: str, limit: int = 10):
    kw = (tu_khoa or "").strip()
    if not kw:
        return can_lam_ro("Bạn muốn tìm đối tác theo mã hoặc tên?", [])

    rows = (
        session.query(BusinessPartner)
        .filter(
            or_(
                BusinessPartner.partner_code.ilike(f"%{kw}%"),
                BusinessPartner.partner_name.ilike(f"%{kw}%"),
                BusinessPartner.tax_code.ilike(f"%{kw}%"),
            )
        )
        .order_by(BusinessPartner.partner_name.asc())
        .limit(limit)
        .all()
    )

    data = [{
        "partner_id": r.partner_id,
        "partner_code": r.partner_code,
        "partner_name": r.partner_name,
        "partner_type": r.partner_type,
        "tax_code": r.tax_code,
    } for r in rows]

    return ok(data, "Danh sách đối tác phù hợp.")


class ThongTinDoiTacArgs(BaseModel):
    partner_code: str


def thong_tin_doi_tac(session: Session, partner_code: str):
    code = (partner_code or "").strip().upper()
    bp = session.query(BusinessPartner).filter(func.upper(BusinessPartner.partner_code) == code).first()
    if not bp:
        cands = _candidates_by_prefix(session, code, limit=5)
        if cands:
            return can_lam_ro(f"Không tìm thấy đối tác đúng mã '{partner_code}'. Bạn muốn chọn mã nào?", cands)
        return can_lam_ro("Không tìm thấy đối tác. Bạn kiểm tra lại mã.", [])

    return ok({
        "partner_id": bp.partner_id,
        "partner_code": bp.partner_code,
        "partner_name": bp.partner_name,
        "partner_type": bp.partner_type,
        "tax_code": bp.tax_code,
        "email": bp.email,
        "phone": bp.phone,
        "address": bp.address,
    }, "Thông tin đối tác.")
    

PARTNERS_TOOLS = [
    ToolSpec("tim_doi_tac", "Tìm đối tác theo mã/tên/mã số thuế.", TimDoiTacArgs, tim_doi_tac, "finance_accounting"),
    ToolSpec("thong_tin_doi_tac", "Lấy thông tin 1 đối tác theo partner_code.", ThongTinDoiTacArgs, thong_tin_doi_tac, "finance_accounting"),
]
