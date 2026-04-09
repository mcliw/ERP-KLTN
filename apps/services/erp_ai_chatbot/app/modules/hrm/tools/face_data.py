from __future__ import annotations

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok, can_lam_ro

# DB HRM mới: employees.face_embedding FLOAT[], avatar_url
from app.modules.hrm.models import Employee


class TrangThaiFaceDataArgs(BaseModel):
    employee_id: int = Field(..., ge=1)


def trang_thai_face_data(session: Session, employee_id: int):
    emp_id_col = getattr(Employee, "employee_id", None) or getattr(Employee, "id", None)
    r = session.query(Employee).filter(emp_id_col == int(employee_id)).first()
    if not r:
        return can_lam_ro("Không tìm thấy nhân viên theo employee_id.", [])

    emb = getattr(r, "face_embedding", None)
    has = False
    try:
        has = emb is not None and len(emb) > 0
    except Exception:
        has = emb is not None

    data = {
        "employee_id": int(employee_id),
        "has_active_face_data": bool(has),
        "avatar_url": getattr(r, "avatar_url", None),
        "face_embedding_dim": len(emb) if (emb is not None and hasattr(emb, "__len__")) else None,
        "note": "DB mới lưu face_embedding trực tiếp trong employees (không có bảng EmployeeFaceData).",
    }
    return ok(data, "Trạng thái face data.")


FACE_DATA_TOOLS = [
    ToolSpec(
        "trang_thai_face_data",
        "Kiểm tra nhân viên đã đăng ký face data chưa (dựa vào employees.face_embedding).",
        TrangThaiFaceDataArgs,
        trang_thai_face_data,
        "hrm",
    ),
]
