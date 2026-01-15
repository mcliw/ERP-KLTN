from __future__ import annotations

import re
from app.ai.plan_schema import Plan
from app.ai.routers.common import gemini_fallback, should_use_rag

def plan_route_supply_chain(module: str, message: str, auth: dict) -> Plan:
    msg = (message or "").strip()
    low = msg.lower()

    # PO code
    has_po_code = re.search(r"\bpo-\d+\b", msg, re.IGNORECASE)

    is_po_question = any(k in low for k in ["po", "đơn mua", "don mua", "đơn đặt mua", "don dat mua", "purchase order"])
    is_deadline = any(k in low for k in [
        "sắp đến hạn", "sap den han", "chuẩn bị đến hạn", "chuan bi den han",
        "đến hạn giao", "den han giao", "gần đến hạn", "gan den han",
        "etd sớm nhất", "etd som nhat", "giao sớm nhất", "giao som nhat",
        "đến hạn giao nhất", "den han giao nhat",
    ])

    wants_progress = any(k in low for k in ["tiến độ", "tien do", "nhập đến đâu", "nhap den dau", "%", "bao nhiêu %", "bao nhieu %"])
    wants_missing = any(k in low for k in ["còn thiếu", "con thieu", "thiếu hàng", "thieu hang", "thiếu sku", "thieu sku"])

    # deadline + tiến độ/thiếu, không có mã PO
    if is_po_question and is_deadline and (wants_progress or wants_missing) and not has_po_code:
        return Plan(
            module=module,
            intent="po_sap_den_han_va_tien_do_nhap",
            needs_clarification=False,
            clarifying_question=None,
            steps=[
                {"id": "s1", "tool": "tim_po_sap_den_han_giao_nhat", "args": {}, "save_as": None},
                {"id": "s2", "tool": "tien_do_nhap_po", "args": {"po_code": "{{s1.data.po_code}}"}, "save_as": None},
            ],
            final_response_template=None
        )

    # có mã PO + hỏi tiến độ/thiếu
    if has_po_code and (wants_progress or wants_missing):
        po_code = has_po_code.group(0).upper()
        return Plan(
            module=module,
            intent="tien_do_nhap_po",
            needs_clarification=False,
            clarifying_question=None,
            steps=[{"id": "s1", "tool": "tien_do_nhap_po", "args": {"po_code": po_code}, "save_as": None}],
            final_response_template=None
        )

    # deadline + hỏi trạng thái
    if is_po_question and is_deadline and not has_po_code:
        return Plan(
            module=module,
            intent="po_sap_den_han_giao_nhat",
            needs_clarification=False,
            clarifying_question=None,
            steps=[
                {"id": "s1", "tool": "tim_po_sap_den_han_giao_nhat", "args": {}, "save_as": None},
                {"id": "s2", "tool": "tra_cuu_trang_thai_don_mua", "args": {"po_code": "{{s1.data.po_code}}"}, "save_as": None},
            ],
            final_response_template=None
        )

    # GR gần đây
    is_gr_recent = (("phiếu nhập" in low or "phieu nhap" in low or "gr" in low) and any(k in low for k in ["gần đây", "gan day", "mới nhất", "moi nhat", "recent"]))
    mentions_supplier = any(k in low for k in ["ncc", "nhà cung cấp", "nha cung cap", "sup"])
    mentions_po = re.search(r"\bpo-\d+\b", msg, re.IGNORECASE) is not None

    if is_gr_recent and (not mentions_supplier) and (not mentions_po):
        m = re.search(r"(\d+)", low)
        limit = int(m.group(1)) if m else 5
        limit = max(1, min(limit, 20))

        days = 7
        if "hôm nay" in low or "hom nay" in low:
            days = 1
        elif "tuần" in low or "tuan" in low:
            days = 7
        elif "tháng" in low or "thang" in low:
            days = 30

        return Plan(
            module=module,
            intent="gr_gan_day",
            needs_clarification=False,
            clarifying_question=None,
            steps=[{"id": "s1", "tool": "gr_gan_day", "args": {"days": days, "limit": limit}, "save_as": None}],
            final_response_template=None
        )

    # RAG
    if should_use_rag(msg):
        return Plan(
            module=module,
            intent="rag",
            needs_clarification=False,
            clarifying_question=None,
            steps=[{"id": "s1", "tool": "tra_cuu_kho_tri_thuc", "args": {"cau_hoi": msg, "top_k": 4}, "save_as": None}],
            final_response_template=None,
        )

    return gemini_fallback(module, msg, auth, extra_hints=[
        "Chính sách/hướng dẫn/FAQ: tra_cuu_kho_tri_thuc(cau_hoi, top_k).",
        "Phiếu nhập gần đây: gr_gan_day(days, limit).",
        "PO sắp đến hạn: tim_po_sap_den_han_giao_nhat() + tra_cuu_trang_thai_don_mua(po_code).",
        "Tiến độ nhập PO: tien_do_nhap_po(po_code).",
    ])
