from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok, can_lam_ro
from app.modules.sale_crm.models import VoucherDetail
from app.modules.sale_crm.tools.helpers import (
    to_float, find_voucher_bundle, now_utc, is_new_customer, voucher_compute_discount
)

class KiemTraVoucherArgs(BaseModel):
    code: str = Field(..., min_length=1, max_length=50)
    order_amount: Optional[float] = Field(default=None, ge=0)
    target_user_id: Optional[int] = Field(default=None, ge=1)

class ChiTietVoucherArgs(BaseModel):
    code: str = Field(..., min_length=1, max_length=50)

class PreviewVoucherArgs(BaseModel):
    code: str = Field(..., min_length=1, max_length=50)
    order_amount: float = Field(..., ge=0)
    target_user_id: Optional[int] = Field(default=None, ge=1)

class GoiYVoucherArgs(BaseModel):
    order_amount: float = Field(..., ge=0)
    target_user_id: Optional[int] = Field(default=None, ge=1)
    limit: int = Field(default=20, ge=1, le=200)

class BaoCaoVoucherArgs(BaseModel):
    limit: int = Field(default=20, ge=1, le=200)

def kiem_tra_voucher_hop_le(session: Session, code: str, order_amount: Optional[float] = None, target_user_id: Optional[int] = None) -> Dict[str, Any]:
    vd, v, vc = find_voucher_bundle(session, code)
    if not vd:
        return ok({"valid": False, "reason": "Voucher không tồn tại hoặc không active."})

    if order_amount is None:
        return can_lam_ro("Bạn vui lòng cho biết giá trị đơn hàng (order_amount) để kiểm tra voucher.", {"code": code})

    now = now_utc()
    if not v.is_active:
        return ok({"valid": False, "reason": "Voucher đang bị tắt."})
    if not (v.start_date <= now <= v.end_date):
        return ok({"valid": False, "reason": "Voucher đã hết hạn hoặc chưa đến thời gian áp dụng."})

    if vd.usage_limit is not None and (vd.used_count or 0) >= vd.usage_limit:
        return ok({"valid": False, "reason": "Voucher đã hết lượt sử dụng."})

    if vc and vc.min_order_amount is not None and order_amount < float(vc.min_order_amount):
        return ok({"valid": False, "reason": "Đơn hàng chưa đạt giá trị tối thiểu để áp voucher."})

    if vc and vc.is_new_customer_only:
        if target_user_id is None:
            return can_lam_ro("Voucher này chỉ áp dụng cho khách mới. Bạn cung cấp target_user_id để kiểm tra.", {"code": code, "order_amount": order_amount})
        if not is_new_customer(session, target_user_id):
            return ok({"valid": False, "reason": "Voucher chỉ áp dụng cho khách mới, tài khoản này không thỏa điều kiện."})

    return ok({
        "valid": True,
        "code": vd.code,
        "discount_type": v.discount_type,
        "discount_value": to_float(v.discount_value),
        "min_order_amount": to_float(vc.min_order_amount) if vc else None,
        "max_discount_amount": to_float(vc.max_discount_amount) if vc else None,
    })

def xem_chi_tiet_voucher(session: Session, code: str) -> Dict[str, Any]:
    vd, v, vc = find_voucher_bundle(session, code)
    if not vd:
        return ok(None, "Không tìm thấy voucher theo mã.")
    return ok({
        "voucher_id": v.id,
        "voucher_name": v.name,
        "description": v.description,
        "code": vd.code,
        "discount_type": v.discount_type,
        "discount_value": to_float(v.discount_value),
        "start_date": v.start_date,
        "end_date": v.end_date,
        "voucher_is_active": v.is_active,
        "code_is_active": vd.is_active,
        "usage_limit": vd.usage_limit,
        "used_count": vd.used_count,
        "min_order_amount": to_float(vc.min_order_amount) if vc else None,
        "max_discount_amount": to_float(vc.max_discount_amount) if vc else None,
        "is_new_customer_only": bool(vc.is_new_customer_only) if vc else False,
    })

def ap_voucher_xem_truoc(session: Session, code: str, order_amount: float, target_user_id: Optional[int] = None) -> Dict[str, Any]:
    check = kiem_tra_voucher_hop_le(session, code, order_amount, target_user_id)
    if not check.get("ok") or (check.get("data") and check["data"].get("valid") is False):
        return check

    vd, v, vc = find_voucher_bundle(session, code)
    discount, payable = voucher_compute_discount(v.discount_type, v.discount_value, order_amount, vc.max_discount_amount if vc else None)
    return ok({
        "code": code,
        "order_amount": order_amount,
        "discount_amount": discount,
        "payable_amount": payable,
        "discount_type": v.discount_type,
        "discount_value": to_float(v.discount_value),
    })

def goi_y_voucher_tot_nhat(session: Session, order_amount: float, target_user_id: Optional[int] = None, limit: int = 20) -> Dict[str, Any]:
    now = now_utc()
    rows = (
        session.query(VoucherDetail)
        .filter(VoucherDetail.is_active == True)
        .limit(limit)
        .all()
    )

    best = None
    candidates = []
    for vd in rows:
        v = vd.voucher
        if not v or not v.is_active or not (v.start_date <= now <= v.end_date):
            continue
        if vd.usage_limit is not None and (vd.used_count or 0) >= vd.usage_limit:
            continue

        # constraint
        vc = getattr(v, "voucher_constraint", None)
        # fallback query if relationship not configured
        # (models có relationship voucher ở constraint, không ngược lại)
        from app.modules.sale_crm.models import VoucherConstraint
        vc = session.query(VoucherConstraint).filter(VoucherConstraint.voucher_id == v.id).first()

        if vc and vc.min_order_amount is not None and order_amount < float(vc.min_order_amount):
            continue
        if vc and vc.is_new_customer_only:
            if target_user_id is None:
                continue
            if not is_new_customer(session, target_user_id):
                continue

        discount, payable = voucher_compute_discount(v.discount_type, v.discount_value, order_amount, vc.max_discount_amount if vc else None)
        cand = {
            "code": vd.code,
            "discount_amount": discount,
            "payable_amount": payable,
            "discount_type": v.discount_type,
            "discount_value": to_float(v.discount_value),
        }
        candidates.append(cand)
        if best is None or discount > best["discount_amount"]:
            best = cand

    return ok({
        "order_amount": order_amount,
        "best_voucher": best,
        "candidates": sorted(candidates, key=lambda x: x["discount_amount"], reverse=True)[:10],
    })

def bao_cao_su_dung_voucher(session: Session, limit: int = 20) -> Dict[str, Any]:
    rows = (
        session.query(VoucherDetail)
        .order_by(VoucherDetail.used_count.desc())
        .limit(limit)
        .all()
    )
    out = []
    for vd in rows:
        usage_limit = vd.usage_limit
        used = vd.used_count or 0
        rate = (used / usage_limit) if usage_limit else None
        out.append({
            "code": vd.code,
            "voucher_id": vd.voucher_id,
            "used_count": used,
            "usage_limit": usage_limit,
            "usage_rate": rate,
            "is_active": vd.is_active,
        })
    return ok(out)

VOUCHER_TOOLS: List[ToolSpec] = [
    ToolSpec("kiem_tra_voucher_hop_le", "Kiểm tra voucher có hợp lệ theo giá trị đơn và constraint.", KiemTraVoucherArgs, kiem_tra_voucher_hop_le, "sale_crm"),
    ToolSpec("xem_chi_tiet_voucher", "Xem chi tiết voucher theo code.", ChiTietVoucherArgs, xem_chi_tiet_voucher, "sale_crm"),
    ToolSpec("ap_voucher_xem_truoc", "Preview áp voucher: giảm bao nhiêu và còn phải trả bao nhiêu.", PreviewVoucherArgs, ap_voucher_xem_truoc, "sale_crm"),
    ToolSpec("goi_y_voucher_tot_nhat", "Gợi ý voucher giảm nhiều nhất theo giá trị đơn.", GoiYVoucherArgs, goi_y_voucher_tot_nhat, "sale_crm"),
    ToolSpec("bao_cao_su_dung_voucher", "Báo cáo voucher dùng nhiều nhất.", BaoCaoVoucherArgs, bao_cao_su_dung_voucher, "sale_crm"),
]
