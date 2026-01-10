from .tra_cuu_mua_hang import MUA_HANG_TOOLS
from .tra_cuu_ton_kho import TON_KHO_TOOLS
from .tra_cuu_nhap_kho import NHAP_KHO_TOOLS
from .tra_cuu_xuat_kho import XUAT_KHO_TOOLS
from .tra_cuu_nha_cung_cap import NHA_CUNG_CAP_TOOLS
from .truy_van_danh_muc import DANH_MUC_TOOLS
from .truy_vet_bien_dong import BIEN_DONG_TOOLS
from .tra_cuu_kiem_ke import KIEM_KE_TOOLS
from .tra_cuu_kho_tri_thuc import RAG_TOOLS

SUPPLY_CHAIN_TOOLS = [
    *MUA_HANG_TOOLS,
    *TON_KHO_TOOLS,
    *NHAP_KHO_TOOLS,
    *XUAT_KHO_TOOLS,
    *NHA_CUNG_CAP_TOOLS,
    *DANH_MUC_TOOLS,
    *BIEN_DONG_TOOLS,
    *KIEM_KE_TOOLS,
    *RAG_TOOLS,
]
