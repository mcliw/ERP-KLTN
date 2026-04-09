from __future__ import annotations

from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func, case
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok

from app.modules.hrm.models import Payslip


def _norm_status(v: str | None) -> str | None:
    if v is None:
        return None
    s = str(v).strip()
    if not s:
        return None
    low = s.lower()
    if low in {"pending", "chua tra", "chưa trả", "unpaid"}:
        return "PENDING"
    if low in {"paid", "da tra", "đã trả"}:
        return "PAID"
    if low == "sent":
        return "SENT"
    return s.upper()


class DanhSachYeuCauThanhToanArgs(BaseModel):
    status: str | None = Field(None, description="PENDING|PAID (SENT không được mô hình hoá trong DB mới)")
    limit: int = Field(20, ge=1, le=100)

    @field_validator("status", mode="before")
    @classmethod
    def _v(cls, v):
        return _norm_status(v)


class YeuCauThanhToanTheoKyArgs(BaseModel):
    """Giữ nguyên arg payroll_period_id để không phá contract cũ.

    DB HRM mới không có payroll_periods/payment_requests.
    Quy ước: payroll_period_id = YYYYMM (vd: 202601).
    """

    payroll_period_id: int = Field(..., ge=200001, le=210012)


def _period_id_to_month_year(payroll_period_id: int):
    y = int(payroll_period_id) // 100
    m = int(payroll_period_id) % 100
    if m < 1 or m > 12:
        return None, None
    return y, m


def danh_sach_yeu_cau_thanh_toan_hrm(session: Session, status: str | None = None, limit: int = 20):
    """Thay thế PaymentRequestHRM bằng tổng hợp payslips theo tháng/năm.

    - payslips.status = false => chưa trả
    - payslips.status = true  => đã trả
    """

    q = session.query(
        Payslip.year.label("year"),
        Payslip.month.label("month"),
        func.count(Payslip.payslip_id).label("total_employees"),
        func.sum(func.coalesce(Payslip.net_salary, 0)).label("total_amount"),
        func.sum(func.coalesce(case((Payslip.status == True, 1), else_=0), 0)).label("paid_count"),  # noqa: E712
        func.sum(func.coalesce(case((Payslip.status == False, 1), else_=0), 0)).label("unpaid_count"),  # noqa: E712
    ).group_by(Payslip.year, Payslip.month)

    rows = q.order_by(Payslip.year.desc(), Payslip.month.desc()).limit(int(limit)).all()

    data = []
    for r in rows:
        period_id = int(r.year) * 100 + int(r.month)
        # trạng thái tổng hợp: nếu còn unpaid_count > 0 -> PENDING else PAID
        agg_status = "PENDING" if int(getattr(r, "unpaid_count", 0) or 0) > 0 else "PAID"
        if status and agg_status != status:
            continue

        data.append(
            {
                "payment_request_id": period_id,
                "payroll_period_id": period_id,
                "request_code": f"PR-HRM-{period_id}",
                "total_amount": float(getattr(r, "total_amount", 0) or 0),
                "total_employees": int(getattr(r, "total_employees", 0) or 0),
                "status": agg_status,
                "finance_transaction_id": None,
                "created_by": None,
                "created_at": None,
            }
        )

    return ok(data[: int(limit)], "Danh sách yêu cầu thanh toán HRM (tổng hợp từ payslips).")


def yeu_cau_thanh_toan_theo_ky(session: Session, payroll_period_id: int):
    y, m = _period_id_to_month_year(payroll_period_id)
    if not y:
        return ok(None, "payroll_period_id không hợp lệ. Dùng YYYYMM (vd: 202601).")

    rows = session.query(Payslip).filter(Payslip.year == int(y), Payslip.month == int(m)).all()
    if not rows:
        return ok(None, "Không có payslip trong kỳ này.")

    total_amount = sum(float(getattr(x, "net_salary", 0) or 0) for x in rows)
    total_employees = len(rows)
    unpaid = sum(1 for x in rows if not bool(getattr(x, "status", False)))

    agg_status = "PENDING" if unpaid > 0 else "PAID"

    data = {
        "payment_request_id": int(payroll_period_id),
        "payroll_period_id": int(payroll_period_id),
        "request_code": f"PR-HRM-{int(payroll_period_id)}",
        "total_amount": float(total_amount),
        "total_employees": int(total_employees),
        "status": agg_status,
        "finance_transaction_id": None,
        "created_by": None,
        "created_at": None,
        "note": "DB mới không có bảng payment_request; dữ liệu được tổng hợp từ payslips.",
    }

    return ok(data, "Yêu cầu thanh toán HRM theo kỳ (tổng hợp).")


PAYMENT_HRM_TOOLS = [
    ToolSpec("danh_sach_yeu_cau_thanh_toan_hrm", "Liệt kê yêu cầu thanh toán HRM (tổng hợp từ payslips).", DanhSachYeuCauThanhToanArgs, danh_sach_yeu_cau_thanh_toan_hrm, "hrm"),
    ToolSpec("yeu_cau_thanh_toan_theo_ky", "Tra cứu yêu cầu thanh toán HRM theo kỳ YYYYMM (tổng hợp từ payslips).", YeuCauThanhToanTheoKyArgs, yeu_cau_thanh_toan_theo_ky, "hrm"),
]
