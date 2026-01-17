from __future__ import annotations

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok
from app.modules.hrm.models import EmployeeFaceData


class TrangThaiFaceDataArgs(BaseModel):
    employee_id: int = Field(..., ge=1)


def trang_thai_face_data(session: Session, employee_id: int):
    r = (
        session.query(EmployeeFaceData)
        .filter(EmployeeFaceData.employee_id == int(employee_id), EmployeeFaceData.is_active == True)  # noqa: E712
        .order_by(EmployeeFaceData.created_at.desc())
        .first()
    )
    data = {
        "employee_id": int(employee_id),
        "has_active_face_data": bool(r),
        "face_data_id": r.id if r else None,
        "image_path": getattr(r, "image_path", None) if r else None,
        "created_at": r.created_at.isoformat() if r and r.created_at else None,
    }
    return ok(data, "Trạng thái face data.")


FACE_DATA_TOOLS = [
    ToolSpec("trang_thai_face_data", "Kiểm tra nhân viên đã đăng ký face data chưa.", TrangThaiFaceDataArgs, trang_thai_face_data, "hrm"),
]
