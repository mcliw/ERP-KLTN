from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok, can_lam_ro
from app.modules.sale_crm.models import VoucherDetail, VoucherConstraint
from app.modules.sale_crm.tools.helpers import to_float, find_voucher_bundle, voucher_compute_discount


class KiemTraVoucherArgs(BaseModel):
    code: str = Field(..., min_length=1, max_length=50)
    order_amount: Optional[float] = Field(default=None, ge=0)


class ChiTietVoucherArgs(BaseModel):
    code: str = Field(..., min_length=1, max_length=50)


class PreviewVoucherArgs(BaseModel):
    code: str = Field(..., min_length=1, max_length=50)
    order_amount: float = Field(..., ge=0)


class GoiYVoucherArgs(BaseModel):
    order_amount: float = Field(..., ge=0)
    limit: int = Field(default=20, ge=1, le=200)


class DanhSachVoucherActiveArgs(BaseModel):
    limit: int = Field(default=50, ge=1, le=500)


def kiem_tra_voucher_hop_le(session: Session, code: str, order_amount: Optional[float] = None) -> Dict[str, Any]:
    vd, v, vc = find_voucher_bundle(session, code)
    if not vd:
        return ok({"valid": False, "reason": "Voucher không tồn tại hoặc code không active."})

    if not getattr(v, "is_active", True):
        return ok({"valid": False, "reason": "Voucher đang bị tắt."})

    if order_amount is None:
        return can_lam_ro("Bạn vui lòng cho biết giá trị đơn hàng (order_amount) để kiểm tra điều kiện min_order_amount.", {"code": code})

    if vc and vc.min_order_amount is not None and order_amount < float(vc.min_order_amount):
        return ok({"valid": False, "reason": "Đơn hàng chưa đạt giá trị tối thiểu để áp voucher."})

    return ok(
        {
            "valid": True,
            "code": vd.code,
            "voucher_id": vd.voucher_id,
            "discount_type": getattr(v, "discount_type", None),
            "discount_value": to_float(getattr(v, "discount_value", None)),
            "min_order_amount": to_float(getattr(vc, "min_order_amount", None)) if vc else None,
            "max_discount_amount": to_float(getattr(vc, "max_discount_amount", None)) if vc else None,
        }
    )


def xem_chi_tiet_voucher(session: Session, code: str) -> Dict[str, Any]:
    vd, v, vc = find_voucher_bundle(session, code)
    if not vd:
        return ok(None, "Không tìm thấy voucher theo mã.")

    return ok(
        {
            "code": vd.code,
            "code_is_active": vd.is_active,
            "voucher_id": vd.voucher_id,
            "voucher_is_active": getattr(v, "is_active", None),
            "discount_type": getattr(v, "discount_type", None),
            "discount_value": to_float(getattr(v, "discount_value", None)),
            "min_order_amount": to_float(getattr(vc, "min_order_amount", None)) if vc else None,
            "max_discount_amount": to_float(getattr(vc, "max_discount_amount", None)) if vc else None,
        }
    )


def ap_voucher_xem_truoc(session: Session, code: str, order_amount: float) -> Dict[str, Any]:
    check = kiem_tra_voucher_hop_le(session, code, order_amount)
    if not check.get("ok") or (check.get("data") and check["data"].get("valid") is False):
        return check

    vd, v, vc = find_voucher_bundle(session, code)
    discount, payable = voucher_compute_discount(
        getattr(v, "discount_type", ""),
        getattr(v, "discount_value", 0),
        order_amount,
        getattr(vc, "max_discount_amount", None) if vc else None,
    )

    return ok(
        {
            "code": code,
            "order_amount": order_amount,
            "discount_amount": discount,
            "payable_amount": payable,
            "discount_type": getattr(v, "discount_type", None),
            "discount_value": to_float(getattr(v, "discount_value", None)),
        }
    )


def goi_y_voucher_tot_nhat(session: Session, order_amount: float, limit: int = 20) -> Dict[str, Any]:
    rows = (
        session.query(VoucherDetail)
        .filter(VoucherDetail.is_active == True)
        .order_by(VoucherDetail.id.desc())
        .limit(limit)
        .all()
    )

    best = None
    candidates = []

    for vd in rows:
        v = vd.voucher
        if not v or not getattr(v, "is_active", True):
            continue

        vc = session.query(VoucherConstraint).filter(VoucherConstraint.voucher_id == v.id).first()
        if vc and vc.min_order_amount is not None and order_amount < float(vc.min_order_amount):
            continue

        discount, payable = voucher_compute_discount(
            getattr(v, "discount_type", ""),
            getattr(v, "discount_value", 0),
            order_amount,
            getattr(vc, "max_discount_amount", None) if vc else None,
        )

        cand = {
            "code": vd.code,
            "discount_amount": discount,
            "payable_amount": payable,
            "discount_type": getattr(v, "discount_type", None),
            "discount_value": to_float(getattr(v, "discount_value", None)),
        }

        candidates.append(cand)
        if best is None or discount > best["discount_amount"]:
            best = cand

    return ok(
        {
            "order_amount": order_amount,
            "best_voucher": best,
            "candidates": sorted(candidates, key=lambda x: x["discount_amount"], reverse=True)[:10],
        }
    )


def danh_sach_voucher_dang_active(session: Session, limit: int = 50) -> Dict[str, Any]:
    rows = (
        session.query(VoucherDetail)
        .filter(VoucherDetail.is_active == True)
        .order_by(VoucherDetail.id.desc())
        .limit(limit)
        .all()
    )

    return ok(
        [
            {
                "code": vd.code,
                "voucher_id": vd.voucher_id,
                "discount_type": getattr(vd.voucher, "discount_type", None) if getattr(vd, "voucher", None) else None,
                "discount_value": to_float(getattr(vd.voucher, "discount_value", None)) if getattr(vd, "voucher", None) else None,
                "is_active": vd.is_active,
            }
            for vd in rows
        ]
    )


VOUCHER_TOOLS: List[ToolSpec] = [
    ToolSpec("kiem_tra_voucher_hop_le", "Kiểm tra voucher theo code + min_order_amount/max_discount_amount (nếu có).", KiemTraVoucherArgs, kiem_tra_voucher_hop_le, "sale_crm"),
    ToolSpec("xem_chi_tiet_voucher", "Xem chi tiết voucher theo code.", ChiTietVoucherArgs, xem_chi_tiet_voucher, "sale_crm"),
    ToolSpec("ap_voucher_xem_truoc", "Preview áp voucher: giảm bao nhiêu và còn phải trả bao nhiêu.", PreviewVoucherArgs, ap_voucher_xem_truoc, "sale_crm"),
    ToolSpec("goi_y_voucher_tot_nhat", "Gợi ý voucher giảm nhiều nhất theo giá trị đơn.", GoiYVoucherArgs, goi_y_voucher_tot_nhat, "sale_crm"),
    ToolSpec("danh_sach_voucher_dang_active", "Liệt kê danh sách voucher_detail đang active (thay cho báo cáo usage vì schema không có used_count/usage_limit).", DanhSachVoucherActiveArgs, danh_sach_voucher_dang_active, "sale_crm"),
]
