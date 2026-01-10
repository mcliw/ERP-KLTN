from __future__ import annotations

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok
from app.modules.hrm.models import PaymentRequestHRM


class DanhSachYeuCauThanhToanArgs(BaseModel):
    status: str | None = Field(None, description="PENDING|SENT|PAID")
    limit: int = Field(20, ge=1, le=100)


class YeuCauThanhToanTheoKyArgs(BaseModel):
    payroll_period_id: int = Field(..., ge=1)


def danh_sach_yeu_cau_thanh_toan_hrm(session: Session, status: str | None = None, limit: int = 20):
    q = session.query(PaymentRequestHRM)
    if status:
        q = q.filter(PaymentRequestHRM.status == status)
    rows = q.order_by(PaymentRequestHRM.created_at.desc()).limit(limit).all()

    data = [{
        "payment_request_id": r.id,
        "payroll_period_id": r.payroll_period_id,
        "request_code": r.request_code,
        "total_amount": float(r.total_amount) if r.total_amount is not None else None,
        "total_employees": r.total_employees,
        "status": r.status,
        "finance_transaction_id": r.finance_transaction_id,
        "created_by": r.created_by,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    } for r in rows]
    return ok(data, "Danh sách yêu cầu thanh toán HRM.")


def yeu_cau_thanh_toan_theo_ky(session: Session, payroll_period_id: int):
    r = session.query(PaymentRequestHRM).filter(PaymentRequestHRM.payroll_period_id == int(payroll_period_id)).order_by(PaymentRequestHRM.created_at.desc()).first()
    if not r:
        return ok(None, "Không có yêu cầu thanh toán HRM cho kỳ này.")
    data = {
        "payment_request_id": r.id,
        "payroll_period_id": r.payroll_period_id,
        "request_code": r.request_code,
        "total_amount": float(r.total_amount) if r.total_amount is not None else None,
        "total_employees": r.total_employees,
        "status": r.status,
        "finance_transaction_id": r.finance_transaction_id,
        "created_by": r.created_by,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }
    return ok(data, "Yêu cầu thanh toán HRM theo kỳ lương.")


PAYMENT_HRM_TOOLS = [
    ToolSpec("danh_sach_yeu_cau_thanh_toan_hrm", "Liệt kê yêu cầu thanh toán HRM.", DanhSachYeuCauThanhToanArgs, danh_sach_yeu_cau_thanh_toan_hrm, "hrm"),
    ToolSpec("yeu_cau_thanh_toan_theo_ky", "Tra cứu yêu cầu thanh toán HRM theo payroll_period_id.", YeuCauThanhToanTheoKyArgs, yeu_cau_thanh_toan_theo_ky, "hrm"),
]
