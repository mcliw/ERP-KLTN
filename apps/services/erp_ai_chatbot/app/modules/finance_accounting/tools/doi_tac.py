# app/modules/finance_accounting/tools/doi_tac.py
from __future__ import annotations
from typing import Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.ai.tooling import ToolSpec, ok, can_lam_ro
from app.modules.finance_accounting.models import BusinessPartner


class DoiTacArgs(BaseModel):
    partner_type: Optional[str] = None     # CUSTOMER/SUPPLIER
    external_id: Optional[str] = None      # mã ngoài hệ thống (unique theo partner_type)
    tu_khoa: Optional[str] = None          # search
    limit: int = 10


def doi_tac(session: Session, partner_type: Optional[str] = None,
            external_id: Optional[str] = None, tu_khoa: Optional[str] = None, limit: int = 10):

    # chi tiết theo external_id
    if external_id:
        ext = external_id.strip()
        if partner_type:
            bp = session.query(BusinessPartner).filter(
                BusinessPartner.partner_type == partner_type,
                BusinessPartner.external_id == ext
            ).first()
            if not bp:
                return can_lam_ro("Không tìm thấy đối tác theo (partner_type, external_id).", [])
            return ok({
                "partner_id": bp.partner_id,
                "partner_type": bp.partner_type,
                "external_id": bp.external_id,
                "partner_name": bp.partner_name,
                "tax_code": bp.tax_code,
                "contact_info": bp.contact_info,
            }, "Chi tiết đối tác.")
        else:
            rows = session.query(BusinessPartner).filter(BusinessPartner.external_id == ext).limit(5).all()
            if not rows:
                return can_lam_ro("Không tìm thấy đối tác theo external_id.", [])
            if len(rows) > 1:
                cands = [f"{r.partner_type}:{r.external_id} - {r.partner_name}" for r in rows]
                return can_lam_ro("external_id trùng ở nhiều loại đối tác. Bạn chọn partner_type nào?", cands)
            bp = rows[0]
            return ok({
                "partner_id": bp.partner_id,
                "partner_type": bp.partner_type,
                "external_id": bp.external_id,
                "partner_name": bp.partner_name,
                "tax_code": bp.tax_code,
                "contact_info": bp.contact_info,
            }, "Chi tiết đối tác.")

    # search
    kw = (tu_khoa or "").strip()
    if not kw:
        return can_lam_ro("Bạn muốn tra cứu đối tác theo external_id hay theo từ khóa (tên/mst)?", [])

    q = session.query(BusinessPartner)
    if partner_type:
        q = q.filter(BusinessPartner.partner_type == partner_type)

    q = q.filter(or_(
        BusinessPartner.external_id.ilike(f"%{kw}%"),
        BusinessPartner.partner_name.ilike(f"%{kw}%"),
        BusinessPartner.tax_code.ilike(f"%{kw}%"),
    ))

    rows = q.order_by(BusinessPartner.partner_name.asc()).limit(limit).all()

    data = [{
        "partner_id": r.partner_id,
        "partner_type": r.partner_type,
        "external_id": r.external_id,
        "partner_name": r.partner_name,
        "tax_code": r.tax_code,
    } for r in rows]

    return ok(data, "Danh sách đối tác phù hợp.")


DOI_TAC_TOOLS = [
    ToolSpec("doi_tac", "Tra cứu khách hàng/nhà cung cấp (tìm kiếm hoặc chi tiết).", DoiTacArgs, doi_tac, "finance_accounting"),
]
