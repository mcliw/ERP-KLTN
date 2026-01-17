from __future__ import annotations

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok
from app.modules.hrm.models import Department, Position, WorkShift


class DanhSachPhongBanArgs(BaseModel):
    limit: int = Field(200, ge=1, le=500, description="Số dòng tối đa")


class DanhSachChucVuArgs(BaseModel):
    limit: int = Field(200, ge=1, le=500, description="Số dòng tối đa")


class DanhSachCaLamArgs(BaseModel):
    limit: int = Field(200, ge=1, le=500, description="Số dòng tối đa")


def danh_sach_phong_ban(session: Session, limit: int = 200):
    rows = session.query(Department).order_by(Department.code.asc()).limit(limit).all()
    data = [{
        "department_id": r.id,
        "department_code": r.code,
        "department_name": r.name,
        "description": getattr(r, "description", None),
    } for r in rows]
    return ok(data, "Danh sách phòng ban.")


def danh_sach_chuc_vu(session: Session, limit: int = 200):
    rows = session.query(Position).order_by(Position.title.asc()).limit(limit).all()
    data = [{
        "position_id": r.id,
        "title": r.title,
        "base_salary_range_min": float(r.base_salary_range_min) if r.base_salary_range_min is not None else None,
        "base_salary_range_max": float(r.base_salary_range_max) if r.base_salary_range_max is not None else None,
        "description": getattr(r, "description", None),
    } for r in rows]
    return ok(data, "Danh sách chức vụ.")


def danh_sach_ca_lam(session: Session, limit: int = 200):
    rows = session.query(WorkShift).order_by(WorkShift.shift_name.asc()).limit(limit).all()
    data = [{
        "work_shift_id": r.id,
        "shift_name": r.shift_name,
        "start_time": str(r.start_time) if r.start_time else None,
        "end_time": str(r.end_time) if r.end_time else None,
        "break_start_time": str(r.break_start_time) if getattr(r, "break_start_time", None) else None,
        "break_end_time": str(r.break_end_time) if getattr(r, "break_end_time", None) else None,
    } for r in rows]
    return ok(data, "Danh sách ca làm.")


DANH_MUC_HRM_TOOLS = [
    ToolSpec("danh_sach_phong_ban", "Liệt kê phòng ban.", DanhSachPhongBanArgs, danh_sach_phong_ban, "hrm"),
    ToolSpec("danh_sach_chuc_vu", "Liệt kê chức vụ.", DanhSachChucVuArgs, danh_sach_chuc_vu, "hrm"),
    ToolSpec("danh_sach_ca_lam", "Liệt kê ca làm.", DanhSachCaLamArgs, danh_sach_ca_lam, "hrm"),
]
