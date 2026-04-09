# apps/services/erp_ai_chatbot/app/ai/routers/router_supply_chain.py
from __future__ import annotations

from app.ai.plan_schema import Plan
from app.ai.routers.common import gemini_fallback


def plan_route_supply_chain(module: str, message: str, auth: dict) -> Plan:
    msg = (message or "").strip()
    low = msg.lower()

    extra_hints = [
        # Nguyên tắc chung (giống HRM)
        "QUY TẮC: Nếu thiếu required args của tool => needs_clarification=true và steps=[] (không gọi tool).",
        "KHÔNG bịa mã chứng từ/code. Không tự inject auth.",

        # Nhận diện code thường gặp
        "NHẬN DIỆN CODE: PO thường dạng 'PO-...' ; GR dạng 'GR-...' ; GI dạng 'GI-...' ; SKU dạng chữ+số có thể có '-'",
        "Nếu user nói 'phiếu nhập/GR' nhưng không đưa GR code => dùng gr_gan_day(days, limit) để lấy danh sách gần đây rồi chain sang chi_tiet_phieu_nhap(gr_code).",
        "Nếu user nói 'phiếu xuất/GI' nhưng không đưa GI code => ưu tiên hỏi lại hoặc dùng danh sách theo loại nếu user có nói issue_type.",

        # Kho tri thức
        "Chính sách/hướng dẫn/FAQ: tra_cuu_kho_tri_thuc(cau_hoi, top_k).",

        # Nhập kho / mua hàng
        "Phiếu nhập gần đây: gr_gan_day(days, limit).",
        "GR theo PO: danh_sach_gr_theo_po(po_code) hoặc doi_chieu_so_luong_po_va_gr(po_code).",
        "Tiến độ nhập PO: tien_do_nhap_po(po_code).",
        "PO sắp đến hạn: tim_po_sap_den_han_giao_nhat() (status PO: DRAFT/SENT/PARTIAL_RECEIVED/RECEIVED/CANCELLED/COMPLETED).",

        # Xuất kho
        "Xuất kho GI: tra_cuu_trang_thai_phieu_xuat(gi_code), chi_tiet_phieu_xuat(gi_code), danh_sach_gi_theo_loai(issue_type=SALES|MANUFACTURING|TRANSFER|DISPOSAL|ADJUSTMENT).",
    ]

    # (Optional) thêm 1–2 hint theo keyword để LLM bắt nhanh hơn, nhưng không tự tạo plan rule-based
    if "hướng dẫn" in low or "chính sách" in low or "faq" in low:
        extra_hints.insert(0, "Nếu câu hỏi là hỏi quy trình/chính sách => ưu tiên tra_cuu_kho_tri_thuc.")
    if "tiến độ" in low and "po" in low:
        extra_hints.insert(0, "Nếu user hỏi tiến độ nhập PO => cần po_code; thiếu po_code thì hỏi lại.")

    return gemini_fallback(module, low, auth, extra_hints=[
    "Chính sách/hướng dẫn/FAQ: tra_cuu_kho_tri_thuc(cau_hoi, top_k).",
    "Phiếu nhập gần đây: gr_gan_day(days, limit).",
    "GR theo PO: danh_sach_gr_theo_po(po_code) hoặc doi_chieu_so_luong_po_va_gr(po_code).",
    "PO sắp đến hạn: tim_po_sap_den_han_giao_nhat() (status PO dùng enum: DRAFT/SENT/PARTIAL_RECEIVED/RECEIVED/CANCELLED/COMPLETED).",
    "Tiến độ nhập PO: tien_do_nhap_po(po_code).",
    "Xuất kho GI: tra_cuu_trang_thai_phieu_xuat(gi_code), chi_tiet_phieu_xuat(gi_code), danh_sach_gi_theo_loai(issue_type=SALES|MANUFACTURING|TRANSFER|DISPOSAL|ADJUSTMENT).",
])
