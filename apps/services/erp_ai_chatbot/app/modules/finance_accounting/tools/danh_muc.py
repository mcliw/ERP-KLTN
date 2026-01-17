# app/modules/finance_accounting/tools/danh_muc.py
from __future__ import annotations
from typing import Optional
from datetime import date
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app.ai.tooling import ToolSpec, ok, can_lam_ro
from app.modules.finance_accounting.models import ChartOfAccounts, FiscalPeriod


def _iso(d):
    return d.isoformat() if d else None

def _to_str(x):
    return str(x) if x is not None else None


class TaiKhoanArgs(BaseModel):
    tu_khoa: Optional[str] = None  # code/name
    loai: Optional[str] = None     # ASSET/LIABILITY/...
    chi_hien_hoat_dong: bool = True
    limit: int = 50


def tai_khoan(session: Session, tu_khoa: Optional[str] = None, loai: Optional[str] = None,
             chi_hien_hoat_dong: bool = True, limit: int = 50):
    q = session.query(ChartOfAccounts)

    if chi_hien_hoat_dong:
        q = q.filter(ChartOfAccounts.is_active.is_(True))

    if loai:
        q = q.filter(ChartOfAccounts.account_type == loai)

    kw = (tu_khoa or "").strip()
    if kw:
        q = q.filter(or_(
            ChartOfAccounts.account_code.ilike(f"%{kw}%"),
            ChartOfAccounts.account_name.ilike(f"%{kw}%"),
        ))

    rows = q.order_by(ChartOfAccounts.account_code.asc()).limit(limit).all()

    # map parent code
    parent_map = {}
    if rows:
        parent_ids = {r.parent_account_id for r in rows if r.parent_account_id}
        if parent_ids:
            parents = session.query(ChartOfAccounts).filter(ChartOfAccounts.account_id.in_(parent_ids)).all()
            parent_map = {p.account_id: p.account_code for p in parents}

    data = [{
        "account_code": r.account_code,
        "account_name": r.account_name,
        "account_type": r.account_type,
        "is_active": bool(r.is_active),
        "parent_account_code": parent_map.get(r.parent_account_id),
    } for r in rows]

    return ok(data, "Danh sách tài khoản kế toán.")


class KyHienTaiArgs(BaseModel):
    ngay: Optional[date] = None


def ky_hien_tai(session: Session, ngay: Optional[date] = None):
    ngay = ngay or date.today()

    p = (
        session.query(FiscalPeriod)
        .filter(
            FiscalPeriod.status == "OPEN",
            FiscalPeriod.start_date <= ngay,
            FiscalPeriod.end_date >= ngay,
        )
        .order_by(FiscalPeriod.start_date.desc())
        .first()
    )
    if not p:
        p = (
            session.query(FiscalPeriod)
            .filter(FiscalPeriod.status == "OPEN")
            .order_by(FiscalPeriod.start_date.desc())
            .first()
        )

    if not p:
        return can_lam_ro("Chưa có kỳ kế toán OPEN trong hệ thống.", [])

    return ok({
        "period_id": p.period_id,
        "period_name": p.period_name,
        "start_date": _iso(p.start_date),
        "end_date": _iso(p.end_date),
        "status": p.status,
    }, "Kỳ kế toán hiện tại.")


class DsKyArgs(BaseModel):
    status: Optional[str] = None  # OPEN/CLOSED
    limit: int = 24


def ds_ky(session: Session, status: Optional[str] = None, limit: int = 24):
    q = session.query(FiscalPeriod)
    if status:
        q = q.filter(FiscalPeriod.status == status)

    rows = q.order_by(FiscalPeriod.start_date.desc()).limit(limit).all()
    data = [{
        "period_id": r.period_id,
        "period_name": r.period_name,
        "start_date": _iso(r.start_date),
        "end_date": _iso(r.end_date),
        "status": r.status,
        "closed_at": _iso(r.closed_at),
        "closed_by_user_id": r.closed_by_user_id,
    } for r in rows]

    return ok(data, "Danh sách kỳ kế toán.")


DANH_MUC_TOOLS = [
    ToolSpec("tai_khoan", "Tra cứu danh mục tài khoản (COA).", TaiKhoanArgs, tai_khoan, "finance_accounting"),
    ToolSpec("ky_hien_tai", "Lấy kỳ kế toán hiện tại (OPEN theo ngày).", KyHienTaiArgs, ky_hien_tai, "finance_accounting"),
    ToolSpec("ds_ky", "Danh sách kỳ kế toán (lọc OPEN/CLOSED).", DsKyArgs, ds_ky, "finance_accounting"),
]
