from __future__ import annotations

from datetime import date
from typing import Optional

from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok, can_lam_ro
from app.modules.finance_accounting.models import FiscalPeriod
from .helpers import norm_text, norm_code, iso_date, candidates_by_prefix


class KyHienTaiArgs(BaseModel):
    as_of: Optional[date] = None


class KyDanhSachArgs(BaseModel):
    status: Optional[str] = None  # OPEN/CLOSED
    limit: int = 24


class KyTrangThaiArgs(BaseModel):
    period_name: Optional[str] = None
    as_of: Optional[date] = None


def ky_hien_tai(session: Session, as_of: Optional[date] = None):
    as_of = as_of or date.today()

    p = (
        session.query(FiscalPeriod)
        .filter(FiscalPeriod.start_date <= as_of)
        .filter(FiscalPeriod.end_date >= as_of)
        .order_by(FiscalPeriod.start_date.desc())
        .first()
    )

    if not p:
        return ok({"as_of": as_of.isoformat(), "period": None}, "Không tìm thấy kỳ kế toán chứa ngày này.")

    return ok(
        {
            "as_of": as_of.isoformat(),
            "period": {
                "period_id": p.period_id,
                "period_name": p.period_name,
                "start_date": iso_date(p.start_date),
                "end_date": iso_date(p.end_date),
                "status": p.status,
                "closed_at": p.closed_at.isoformat() if p.closed_at else None,
                "closed_by_user_id": p.closed_by_user_id,
            },
        },
        "Kỳ kế toán hiện tại.",
    )


def ky_danh_sach(session: Session, status: Optional[str] = None, limit: int = 24):
    q = session.query(FiscalPeriod)
    if status:
        q = q.filter(FiscalPeriod.status == norm_code(status))

    rows = (
        q.order_by(FiscalPeriod.start_date.desc())
        .limit(max(1, min(limit, 120)))
        .all()
    )

    return ok(
        [
            {
                "period_id": r.period_id,
                "period_name": r.period_name,
                "start_date": iso_date(r.start_date),
                "end_date": iso_date(r.end_date),
                "status": r.status,
            }
            for r in rows
        ],
        "Danh sách kỳ kế toán.",
    )


def ky_trang_thai(session: Session, period_name: Optional[str] = None, as_of: Optional[date] = None):
    if period_name:
        name = norm_text(period_name)
        p = session.query(FiscalPeriod).filter(FiscalPeriod.period_name == name).first()
        if not p:
            cands = candidates_by_prefix(session, FiscalPeriod, "period_name", name, limit=10)
            if cands:
                return can_lam_ro(f"Không tìm thấy kỳ '{period_name}'. Bạn muốn chọn kỳ nào?", cands)
            return can_lam_ro("Không tìm thấy kỳ kế toán.", [])

        return ok(
            {
                "period_id": p.period_id,
                "period_name": p.period_name,
                "start_date": iso_date(p.start_date),
                "end_date": iso_date(p.end_date),
                "status": p.status,
                "closed_at": p.closed_at.isoformat() if p.closed_at else None,
                "closed_by_user_id": p.closed_by_user_id,
            },
            "Trạng thái kỳ kế toán.",
        )

    # fallback theo ngày
    return ky_hien_tai(session, as_of=as_of)


KY_KE_TOAN_TOOLS = [
    ToolSpec("ky_hien_tai", "Lấy kỳ kế toán đang chứa ngày as_of (mặc định hôm nay).", KyHienTaiArgs, ky_hien_tai, "finance_accounting"),
    ToolSpec("ky_danh_sach", "Danh sách kỳ kế toán (lọc status).", KyDanhSachArgs, ky_danh_sach, "finance_accounting"),
    ToolSpec("ky_trang_thai", "Tra trạng thái 1 kỳ theo period_name hoặc theo ngày as_of.", KyTrangThaiArgs, ky_trang_thai, "finance_accounting"),
]
