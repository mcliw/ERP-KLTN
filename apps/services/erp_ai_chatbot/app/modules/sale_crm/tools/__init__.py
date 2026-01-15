from __future__ import annotations

from typing import List
from pydantic import BaseModel, Field

from app.ai.tooling import ToolSpec

from .orders import ORDER_TOOLS, don_hang_gan_nhat
from .payments import PAYMENT_TOOLS
from .purchases import PURCHASE_TOOLS
from .vouchers import VOUCHER_TOOLS
from .products import PRODUCT_TOOLS
from .reviews import REVIEW_TOOLS
from .customers import CUSTOMER_TOOLS
from .report import REPORT_TOOLS


class DonHangGanNhatArgs(BaseModel):
    target_user_id: int | None = Field(default=None, ge=1)

_fixed_order_tools: List[ToolSpec] = []
for t in ORDER_TOOLS:
    if t.ten_tool == "don_hang_gan_nhat":
        _fixed_order_tools.append(
            ToolSpec(
                ten_tool="don_hang_gan_nhat",
                mo_ta="Lấy đơn hàng gần nhất của khách hàng.",
                args_model=DonHangGanNhatArgs,
                handler=don_hang_gan_nhat,
                module="sale_crm",
            )
        )
    else:
        _fixed_order_tools.append(t)


SALE_CRM_TOOLS: List[ToolSpec] = (
    _fixed_order_tools
    + PAYMENT_TOOLS
    + PURCHASE_TOOLS
    + VOUCHER_TOOLS
    + PRODUCT_TOOLS
    + REVIEW_TOOLS
    + CUSTOMER_TOOLS
    + REPORT_TOOLS
)
