from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok, can_lam_ro
from app.modules.sale_crm.models import User, Address, Role

class HoSoArgs(BaseModel):
    target_user_id: Optional[int] = Field(default=None, ge=1)

class DiaChiArgs(BaseModel):
    target_user_id: Optional[int] = Field(default=None, ge=1)

class TimKhachHangArgs(BaseModel):
    keyword: str = Field(..., min_length=1, max_length=255)
    limit: int = Field(default=20, ge=1, le=200)

def ho_so_khach_hang(session: Session, target_user_id: Optional[int] = None) -> Dict[str, Any]:
    if target_user_id is None:
        return can_lam_ro("Bạn cần cung cấp target_user_id để xem hồ sơ khách hàng.", {})
    row = (
        session.query(User, Role)
        .outerjoin(Role, User.role_id == Role.id)
        .filter(User.id == target_user_id)
        .first()
    )
    if not row:
        return ok(None, "Không tìm thấy khách hàng.")
    u, r = row

    default_addr = (
        session.query(Address)
        .filter(Address.user_id == u.id, Address.is_default == True)
        .first()
    )
    addr_count = session.query(Address.id).filter(Address.user_id == u.id).count()

    return ok({
        "user_id": u.id,
        "username": u.username,
        "email": u.email,
        "phone": u.phone,
        "role_name": r.role_name if r else None,
        "created_at": u.created_at,
        "updated_at": u.updated_at,
        "address_count": addr_count,
        "default_address": None if not default_addr else {
            "address_id": default_addr.id,
            "city": default_addr.city,
            "district": default_addr.district,
            "ward": default_addr.ward,
            "street_address": default_addr.street_address,
            "is_default": default_addr.is_default,
        }
    })

def danh_sach_dia_chi(session: Session, target_user_id: Optional[int] = None) -> Dict[str, Any]:
    if target_user_id is None:
        return can_lam_ro("Bạn cần cung cấp target_user_id để xem địa chỉ.", {})
    rows = session.query(Address).filter(Address.user_id == target_user_id).order_by(Address.is_default.desc(), Address.id.desc()).all()
    return ok([{
        "address_id": a.id,
        "city": a.city,
        "district": a.district,
        "ward": a.ward,
        "street_address": a.street_address,
        "is_default": a.is_default,
    } for a in rows])

def tim_khach_hang(session: Session, keyword: str, limit: int = 20) -> Dict[str, Any]:
    like = f"%{keyword}%"
    rows = (
        session.query(User, Role)
        .outerjoin(Role, User.role_id == Role.id)
        .filter(or_(User.username.ilike(like), User.email.ilike(like), User.phone.ilike(like)))
        .limit(limit)
        .all()
    )
    return ok([{
        "user_id": u.id,
        "username": u.username,
        "email": u.email,
        "phone": u.phone,
        "role_name": r.role_name if r else None,
        "created_at": u.created_at,
    } for u, r in rows])

CUSTOMER_TOOLS: List[ToolSpec] = [
    ToolSpec("ho_so_khach_hang", "Xem hồ sơ khách hàng (user + default address).", HoSoArgs, ho_so_khach_hang, "sale_crm"),
    ToolSpec("danh_sach_dia_chi", "Danh sách địa chỉ giao hàng của khách.", DiaChiArgs, danh_sach_dia_chi, "sale_crm"),
    ToolSpec("tim_khach_hang", "Tìm khách hàng theo username/email/phone.", TimKhachHangArgs, tim_khach_hang, "sale_crm"),
]
