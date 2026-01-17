from .tra_cuu_nhan_su import NHAN_SU_TOOLS
from .cham_cong import CHAM_CONG_TOOLS
from .nghi_phep import NGHI_PHEP_TOOLS
from .tang_ca import TANG_CA_TOOLS
from .hop_dong import HOP_DONG_TOOLS
from .bang_luong import BANG_LUONG_TOOLS
from .truy_van_danh_muc import DANH_MUC_HRM_TOOLS
from .face_data import FACE_DATA_TOOLS
from .payment_request import PAYMENT_HRM_TOOLS

HRM_TOOLS = [
    *NHAN_SU_TOOLS,
    *CHAM_CONG_TOOLS,
    *NGHI_PHEP_TOOLS,
    *TANG_CA_TOOLS,
    *HOP_DONG_TOOLS,
    *BANG_LUONG_TOOLS,
    *DANH_MUC_HRM_TOOLS,
    *FACE_DATA_TOOLS,
    *PAYMENT_HRM_TOOLS,
]
