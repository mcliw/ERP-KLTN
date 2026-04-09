from __future__ import annotations

from typing import Optional

from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok, can_lam_ro
from app.modules.finance_accounting.models import BusinessPartner, ChartOfAccounts
from .helpers import norm_text, norm_code, candidates_by_prefix


# =========================
# ĐỐI TÁC (Business Partner)
# =========================
class BPTimArgs(BaseModel):
    tu_khoa: str
    partner_type: Optional[str] = None  # CUSTOMER/SUPPLIER
    limit: int = 10


class BPChiTietArgs(BaseModel):
    external_id: str
    partner_type: str  # CUSTOMER/SUPPLIER


class BPDanhSachArgs(BaseModel):
    partner_type: Optional[str] = None
    limit: int = 20


def bp_tim(session: Session, tu_khoa: str, partner_type: Optional[str] = None, limit: int = 10):
    kw = norm_text(tu_khoa)
    if not kw:
        return can_lam_ro("Thiếu từ khóa đối tác.", [])

    q = session.query(BusinessPartner)
    if partner_type:
        q = q.filter(BusinessPartner.partner_type == norm_code(partner_type))

    # match theo external_id hoặc name
    like = f"%{kw}%"
    rows = (
        q.filter(
            func.lower(BusinessPartner.external_id).like(func.lower(like))
            | func.lower(BusinessPartner.partner_name).like(func.lower(like))
        )
        .order_by(BusinessPartner.partner_type.asc(), BusinessPartner.external_id.asc())
        .limit(max(1, min(limit, 50)))
        .all()
    )

    data = [
        {
            "partner_type": r.partner_type,
            "external_id": r.external_id,
            "partner_name": r.partner_name,
            "tax_code": r.tax_code,
        }
        for r in rows
    ]

    if not data:
        return ok([], "Không có đối tác phù hợp.")

    return ok(data, "Danh sách đối tác.")


def bp_chi_tiet(session: Session, external_id: str, partner_type: str):
    ext = norm_text(external_id)
    ptype = norm_code(partner_type)

    bp = (
        session.query(BusinessPartner)
        .filter(BusinessPartner.partner_type == ptype, BusinessPartner.external_id == ext)
        .first()
    )
    if not bp:
        # gợi ý theo prefix external_id
        cands = (
            session.query(BusinessPartner.external_id)
            .filter(BusinessPartner.partner_type == ptype)
            .filter(func.upper(BusinessPartner.external_id).like(norm_code(ext) + "%"))
            .order_by(BusinessPartner.external_id.asc())
            .limit(10)
            .all()
        )
        cands = [x[0] for x in cands]
        if cands:
            return can_lam_ro(
                f"Không tìm thấy đối tác '{external_id}' ({ptype}). Bạn muốn chọn mã nào?",
                cands,
            )
        return can_lam_ro("Không tìm thấy đối tác.", [])

    return ok(
        {
            "partner_id": bp.partner_id,
            "partner_type": bp.partner_type,
            "external_id": bp.external_id,
            "partner_name": bp.partner_name,
            "tax_code": bp.tax_code,
            "contact_info": bp.contact_info,
            "created_at": bp.created_at.isoformat() if bp.created_at else None,
            "updated_at": bp.updated_at.isoformat() if bp.updated_at else None,
        },
        "Chi tiết đối tác.",
    )


def bp_danh_sach(session: Session, partner_type: Optional[str] = None, limit: int = 20):
    q = session.query(BusinessPartner)
    if partner_type:
        q = q.filter(BusinessPartner.partner_type == norm_code(partner_type))

    rows = (
        q.order_by(BusinessPartner.partner_type.asc(), BusinessPartner.external_id.asc())
        .limit(max(1, min(limit, 100)))
        .all()
    )

    return ok(
        [
            {
                "partner_type": r.partner_type,
                "external_id": r.external_id,
                "partner_name": r.partner_name,
                "tax_code": r.tax_code,
            }
            for r in rows
        ],
        "Danh sách đối tác.",
    )


# =========================
# TÀI KHOẢN KẾ TOÁN (COA)
# =========================
class COATimArgs(BaseModel):
    tu_khoa: str
    account_type: Optional[str] = None  # ASSET/LIABILITY/...
    limit: int = 20


class COAChiTietArgs(BaseModel):
    account_code: str


class COADanhMucArgs(BaseModel):
    account_type: Optional[str] = None
    is_active: Optional[bool] = True
    limit: int = 50


def coa_tim(session: Session, tu_khoa: str, account_type: Optional[str] = None, limit: int = 20):
    kw = norm_text(tu_khoa)
    if not kw:
        return can_lam_ro("Thiếu từ khóa tài khoản.", [])

    q = session.query(ChartOfAccounts)
    if account_type:
        q = q.filter(ChartOfAccounts.account_type == norm_code(account_type))

    like = f"%{kw}%"
    rows = (
        q.filter(
            func.lower(ChartOfAccounts.account_code).like(func.lower(like))
            | func.lower(ChartOfAccounts.account_name).like(func.lower(like))
        )
        .order_by(ChartOfAccounts.account_code.asc())
        .limit(max(1, min(limit, 100)))
        .all()
    )

    return ok(
        [
            {
                "account_code": r.account_code,
                "account_name": r.account_name,
                "account_type": r.account_type,
                "is_active": r.is_active,
                "parent_account_id": r.parent_account_id,
            }
            for r in rows
        ],
        "Danh sách tài khoản phù hợp.",
    )


def coa_chi_tiet(session: Session, account_code: str):
    code = norm_text(account_code)
    acc = session.query(ChartOfAccounts).filter(ChartOfAccounts.account_code == code).first()

    if not acc:
        cands = candidates_by_prefix(session, ChartOfAccounts, "account_code", code, limit=10)
        if cands:
            return can_lam_ro(
                f"Không tìm thấy tài khoản '{account_code}'. Bạn muốn chọn mã nào?",
                cands,
            )
        return can_lam_ro("Không tìm thấy tài khoản kế toán.", [])

    parent = None
    if acc.parent_account_id:
        parent = (
            session.query(ChartOfAccounts)
            .filter(ChartOfAccounts.account_id == acc.parent_account_id)
            .first()
        )

    return ok(
        {
            "account_id": acc.account_id,
            "account_code": acc.account_code,
            "account_name": acc.account_name,
            "account_type": acc.account_type,
            "is_active": acc.is_active,
            "parent": {
                "account_code": parent.account_code,
                "account_name": parent.account_name,
            }
            if parent
            else None,
        },
        "Chi tiết tài khoản kế toán.",
    )


def coa_danh_muc(session: Session, account_type: Optional[str] = None, is_active: Optional[bool] = True, limit: int = 50):
    q = session.query(ChartOfAccounts)

    if account_type:
        q = q.filter(ChartOfAccounts.account_type == norm_code(account_type))

    if is_active is not None:
        q = q.filter(ChartOfAccounts.is_active == bool(is_active))

    rows = (
        q.order_by(ChartOfAccounts.account_code.asc())
        .limit(max(1, min(limit, 200)))
        .all()
    )

    return ok(
        [
            {
                "account_code": r.account_code,
                "account_name": r.account_name,
                "account_type": r.account_type,
                "is_active": r.is_active,
                "parent_account_id": r.parent_account_id,
            }
            for r in rows
        ],
        "Danh mục tài khoản kế toán.",
    )


DOI_TAC_TOOLS = [
    ToolSpec("bp_tim", "Tìm đối tác (Business Partner) theo external_id hoặc tên.", BPTimArgs, bp_tim, "finance_accounting"),
    ToolSpec("bp_chi_tiet", "Xem chi tiết 1 đối tác theo partner_type + external_id.", BPChiTietArgs, bp_chi_tiet, "finance_accounting"),
    ToolSpec("bp_danh_sach", "Danh sách đối tác theo loại.", BPDanhSachArgs, bp_danh_sach, "finance_accounting"),
    ToolSpec("coa_tim", "Tìm tài khoản kế toán theo mã/tên.", COATimArgs, coa_tim, "finance_accounting"),
    ToolSpec("coa_chi_tiet", "Chi tiết tài khoản kế toán theo account_code.", COAChiTietArgs, coa_chi_tiet, "finance_accounting"),
    ToolSpec("coa_danh_muc", "Danh mục tài khoản kế toán.", COADanhMucArgs, coa_danh_muc, "finance_accounting"),
]
