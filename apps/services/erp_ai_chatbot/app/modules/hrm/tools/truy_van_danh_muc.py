from __future__ import annotations

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok
from app.modules.hrm.models import Department, Position


class DanhSachPhongBanArgs(BaseModel):
    limit: int = Field(200, ge=1, le=500, description="Số dòng tối đa")


class DanhSachChucVuArgs(BaseModel):
    limit: int = Field(200, ge=1, le=500, description="Số dòng tối đa")


class DanhSachTrangThaiChamCongArgs(BaseModel):
    """Danh mục trạng thái chấm công (timesheet_status_enum)."""
    # Không cần DB vì đây là enum trong schema
    limit: int = Field(20, ge=1, le=100, description="Số dòng tối đa")


def danh_sach_phong_ban(session: Session, limit: int = 200):
    dept_id_col = getattr(Department, "department_id", None) or getattr(Department, "id", None)
    rows = session.query(Department).order_by(Department.code.asc()).limit(limit).all()
    data = [{
        "department_id": getattr(r, "department_id", None) or getattr(r, "id", None),
        "department_code": r.code,
        "department_name": r.name,
        "description": getattr(r, "description", None),
    } for r in rows]
    return ok(data, "Danh sách phòng ban.")


def danh_sach_chuc_vu(session: Session, limit: int = 200):
    # DB mới: positions.name, code
    name_col = getattr(Position, "name", None) or getattr(Position, "title", None)
    rows = session.query(Position).order_by(name_col.asc()).limit(limit).all()
    data = [{
        "position_id": getattr(r, "position_id", None) or getattr(r, "id", None),
        "position_code": getattr(r, "code", None),
        "position_name": getattr(r, "name", None) or getattr(r, "title", None),
        "department_id": getattr(r, "department_id", None),
        "quota": getattr(r, "quota", None),
        "description": getattr(r, "description", None),
    } for r in rows]
    return ok(data, "Danh sách chức vụ.")


def danh_sach_trang_thai_cham_cong(session: Session, limit: int = 20):
    # Schema HRM mới không có bảng work_shifts.
    # Thay vào đó, tool này cung cấp danh mục trạng thái chấm công để LLM hiểu các trạng thái hợp lệ.
    statuses = [
        "ON_TIME",
        "LATE",
        "LEAVE_EARLY",
        "ABSENT",
        "LEAVE_PAID",
        "LEAVE_UNPAID",
    ]
    data = [{"status": s} for s in statuses[: max(1, min(int(limit), 100))]]
    return ok(data, "Danh mục trạng thái chấm công (timesheet_status_enum).")


DANH_MUC_HRM_TOOLS = [
    ToolSpec("danh_sach_phong_ban", "Liệt kê phòng ban.", DanhSachPhongBanArgs, danh_sach_phong_ban, "hrm"),
    ToolSpec("danh_sach_chuc_vu", "Liệt kê chức vụ.", DanhSachChucVuArgs, danh_sach_chuc_vu, "hrm"),
    ToolSpec("danh_sach_trang_thai_cham_cong", "Liệt kê danh mục trạng thái chấm công (enum).", DanhSachTrangThaiChamCongArgs, danh_sach_trang_thai_cham_cong, "hrm"),
]
