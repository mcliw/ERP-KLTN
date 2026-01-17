# app/modules/finance_accounting/tools/__init__.py
from app.modules.finance_accounting.tools.danh_muc import DANH_MUC_TOOLS
from app.modules.finance_accounting.tools.doi_tac import DOI_TAC_TOOLS
from app.modules.finance_accounting.tools.hoa_don import HOA_DON_TOOLS
from app.modules.finance_accounting.tools.cong_no import CONG_NO_TOOLS
from app.modules.finance_accounting.tools.thu_chi import THU_CHI_TOOLS
from app.modules.finance_accounting.tools.so_sach import SO_SACH_TOOLS
from app.modules.finance_accounting.tools.tri_thuc import TRI_THUC_TOOLS
from app.modules.finance_accounting.tools.giai_thich import GIAI_THICH_TOOLS

FINANCE_ACCOUNTING_TOOLS = [
    *DANH_MUC_TOOLS,
    *DOI_TAC_TOOLS,
    *HOA_DON_TOOLS,
    *CONG_NO_TOOLS,
    *THU_CHI_TOOLS,
    *SO_SACH_TOOLS,
    *TRI_THUC_TOOLS,
    *GIAI_THICH_TOOLS,
]
