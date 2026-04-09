from app.modules.finance_accounting.tools.hoa_don_ap import HOA_DON_AP_TOOLS
from app.modules.finance_accounting.tools.hoa_don_ar import HOA_DON_AR_TOOLS
from app.modules.finance_accounting.tools.cong_no import CONG_NO_TOOLS
from app.modules.finance_accounting.tools.ky_ke_toan import KY_KE_TOAN_TOOLS
from app.modules.finance_accounting.tools.so_ke_toan import SO_KE_TOAN_TOOLS
from app.modules.finance_accounting.tools.doi_tac import DOI_TAC_TOOLS
from app.modules.finance_accounting.tools.posting_rule import POSTING_RULE_TOOLS
from app.modules.finance_accounting.tools.thu_chi import THU_CHI_TOOLS

FINANCE_ACCOUNTING_TOOLS = [
    *CONG_NO_TOOLS,
    *HOA_DON_AP_TOOLS,
    *HOA_DON_AR_TOOLS,
    *KY_KE_TOAN_TOOLS,
    *SO_KE_TOAN_TOOLS,
    *DOI_TAC_TOOLS,
    *POSTING_RULE_TOOLS,
    *THU_CHI_TOOLS,
]