from __future__ import annotations

from typing import List

from app.ai.tooling import ToolSpec

from .orders import ORDER_TOOLS
from .payments import PAYMENT_TOOLS
from .purchases import PURCHASE_TOOLS
from .vouchers import VOUCHER_TOOLS
from .products import PRODUCT_TOOLS
from .reviews import REVIEW_TOOLS
from .customers import CUSTOMER_TOOLS
from .report import REPORT_TOOLS

SALE_CRM_TOOLS: List[ToolSpec] = (
    ORDER_TOOLS
    + PAYMENT_TOOLS
    + PURCHASE_TOOLS
    + VOUCHER_TOOLS
    + PRODUCT_TOOLS
    + REVIEW_TOOLS
    + CUSTOMER_TOOLS
    + REPORT_TOOLS
)
