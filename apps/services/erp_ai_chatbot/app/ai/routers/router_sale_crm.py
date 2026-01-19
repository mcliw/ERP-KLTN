from __future__ import annotations

import re
from app.ai.plan_schema import Plan
from app.ai.routers.common import gemini_fallback
from app.ai.module_registry import list_tools

_ORDER_ID_RE = re.compile(r"(?:đơn hàng|don hang|order)\s*#?\s*(\d+)", re.IGNORECASE)
_VOUCHER_RE = re.compile(r"(?:mã|ma|voucher|code)\s*([A-Za-z0-9_-]{3,30})", re.IGNORECASE)
_PRODUCT_ID_RE = re.compile(r"(?:sản phẩm|san pham|product)\s*#?\s*(\d+)", re.IGNORECASE)

def _toolset() -> set[str]:
    return {t.ten_tool for t in list_tools("sale_crm")}

def _has_any(low: str, keys: list[str]) -> bool:
    return any(k in low for k in keys)

def _extract_money_amount(msg: str) -> float | None:
    # bắt số kiểu: 2000000 / 2.000.000 / 2,000,000
    m_money = re.search(r"(?<![A-Za-z])(\d{4,}|\d{1,3}(?:[.,]\d{3})+)(?![A-Za-z])", msg or "")
    if not m_money:
        return None
    raw = m_money.group(1).replace(".", "").replace(",", "")
    try:
        return float(raw)
    except Exception:
        return None

def plan_route_sale_crm(module: str, message: str, auth: dict) -> Plan:
    msg = (message or "").strip()
    low = msg.lower()
    tools = _toolset()

    uid = auth.get("user_id") if isinstance(auth, dict) else None
    role = auth.get("role") if isinstance(auth, dict) else None

    m_order = _ORDER_ID_RE.search(msg)
    m_voucher = _VOUCHER_RE.search(msg)
    m_prod = _PRODUCT_ID_RE.search(msg)

    wants_status = _has_any(low, ["trạng thái", "tình trạng", "đang ở đâu", "giao chưa", "da giao", "ship", "shipping"])
    wants_detail = _has_any(low, ["chi tiết", "chi tiet", "gồm", "gom", "mua những gì", "co nhung san pham"])
    wants_payment = _has_any(low, ["thanh toán", "thanh toán chưa", "thanh toan chua", "đã thanh toán", "da thanh toan", "payment", "trả tiền", "tra tien", "bị trừ", "bi tru"])
    wants_history = _has_any(low, ["lịch sử", "lich su", "đã mua", "da mua", "mua trước", "mua truoc"])
    wants_preview = _has_any(low, ["áp", " ap ", "preview", "còn bao nhiêu", "con bao nhieu", "giảm bao nhiêu", "giam bao nhieu"])
    wants_latest_order = _has_any(low, ["đơn hàng gần nhất", "don hang gan nhat", "đơn gần nhất", "mới nhất", "gần nhất", "latest order", "recent order"])
    wants_owner = _has_any(low, ["của ai", "ai đặt", "ai mua", "belongs to who"])

    # =========================
    # 0) ƯU TIÊN: hỏi chủ đơn theo order_id
    # =========================
    if m_order and wants_owner and "chu_don_hang" in tools:
        order_id = int(m_order.group(1))
        # CUSTOMER thường chỉ được xem SELF; nếu role khác có thể để None để scope resolver xử lý
        target_uid = uid if role == "CUSTOMER" else None
        return Plan(
            module=module,
            intent="chu_don_hang",
            needs_clarification=False,
            clarifying_question=None,
            steps=[{
                "id": "s1",
                "tool": "chu_don_hang",
                "args": {"order_id": order_id, "target_user_id": target_uid} if target_uid else {"order_id": order_id},
                "save_as": None
            }],
            final_response_template=None,
        )

    # =========================
    # 1) ĐƠN HÀNG: status/detail/payment theo order_id
    # =========================
    if m_order:
        order_id = int(m_order.group(1))

        if wants_status and "tra_cuu_trang_thai_don_hang" in tools:
            return Plan(
                module=module,
                intent="tra_cuu_trang_thai_don_hang",
                needs_clarification=False,
                clarifying_question=None,
                steps=[{"id": "s1", "tool": "tra_cuu_trang_thai_don_hang", "args": {"order_id": order_id, "target_user_id": uid}, "save_as": None}],
                final_response_template=None,
            )

        if wants_detail and "chi_tiet_don_hang" in tools:
            return Plan(
                module=module,
                intent="chi_tiet_don_hang",
                needs_clarification=False,
                clarifying_question=None,
                steps=[{"id": "s1", "tool": "chi_tiet_don_hang", "args": {"order_id": order_id, "target_user_id": uid}, "save_as": "order_detail"}],
                final_response_template=None,
            )

        if wants_payment and "trang_thai_thanh_toan_theo_don" in tools:
            return Plan(
                module=module,
                intent="trang_thai_thanh_toan_theo_don",
                needs_clarification=False,
                clarifying_question=None,
                steps=[{"id": "s1", "tool": "trang_thai_thanh_toan_theo_don", "args": {"order_id": order_id, "target_user_id": uid}, "save_as": None}],
                final_response_template=None,
            )

    # =========================
    # 2) ĐƠN GẦN NHẤT / ĐƠN GẦN NHẤT + THANH TOÁN
    # =========================
    if wants_latest_order and "don_hang_gan_nhat" in tools:
        if not uid:
            return Plan(
                module=module,
                intent="don_hang_gan_nhat",
                needs_clarification=True,
                clarifying_question="Bạn vui lòng đăng nhập (hoặc cung cấp định danh khách hàng) để mình lấy đơn hàng gần nhất.",
                steps=[],
                final_response_template=None,
            )

        # nếu user hỏi thanh toán + gần nhất => chain
        if wants_payment and "trang_thai_thanh_toan_theo_don" in tools:
            return Plan(
                module=module,
                intent="don_gan_nhat_va_thanh_toan",
                needs_clarification=False,
                clarifying_question=None,
                steps=[
                    {"id": "s1", "tool": "don_hang_gan_nhat", "args": {"target_user_id": uid}, "save_as": "latest_order"},
                    {"id": "s2", "tool": "trang_thai_thanh_toan_theo_don", "args": {"order_id": "{{latest_order.order_id}}", "target_user_id": uid}, "save_as": "payment_status"},
                ],
                final_response_template=None,
            )

        return Plan(
            module=module,
            intent="don_hang_gan_nhat",
            needs_clarification=False,
            clarifying_question=None,
            steps=[{"id": "s1", "tool": "don_hang_gan_nhat", "args": {"target_user_id": uid}, "save_as": None}],
            final_response_template=None,
        )

    # =========================
    # 3) REPORT: hãng mua nhiều nhất
    # =========================
    wants_top_brand = (("hãng" in low or "hang" in low or "brand" in low) and ("nhiều nhất" in low or "nhieu nhat" in low or "mua nhiều" in low or "mua nhieu" in low))
    if wants_top_brand and uid and "hang_mua_nhieu_nhat" in tools:
        return Plan(
            module=module,
            intent="hang_mua_nhieu_nhat",
            needs_clarification=False,
            clarifying_question=None,
            steps=[{"id": "s1", "tool": "hang_mua_nhieu_nhat", "args": {"target_user_id": uid, "limit": 10}, "save_as": None}],
            final_response_template=None,
        )

    # =========================
    # 4) LỊCH SỬ MUA
    # =========================
    if wants_history and "lich_su_mua_hang" in tools:
        return Plan(
            module=module,
            intent="lich_su_mua_hang",
            needs_clarification=False,
            clarifying_question=None,
            steps=[{"id": "s1", "tool": "lich_su_mua_hang", "args": {"target_user_id": uid, "limit": 20}, "save_as": None}],
            final_response_template=None,
        )

    # =========================
    # 5) VOUCHER: preview / kiểm tra
    # =========================
    if m_voucher:
        code = m_voucher.group(1).upper()

        # áp voucher cho đơn #... => lấy total rồi preview
        if m_order and wants_preview and ("chi_tiet_don_hang" in tools) and ("ap_voucher_xem_truoc" in tools):
            order_id = int(m_order.group(1))
            return Plan(
                module=module,
                intent="ap_voucher_cho_don",
                needs_clarification=False,
                clarifying_question=None,
                steps=[
                    {"id": "s1", "tool": "chi_tiet_don_hang", "args": {"order_id": order_id, "target_user_id": uid}, "save_as": "order_detail"},
                    # QUAN TRỌNG: voucher tool thường chỉ nhận code + order_amount (KHÔNG target_user_id)
                    {"id": "s2", "tool": "ap_voucher_xem_truoc", "args": {"code": code, "order_amount": "{{order_detail.total_amount}}"}, "save_as": None},
                ],
                final_response_template=None,
            )

        amount = _extract_money_amount(msg)
        if amount is not None and ("ap_voucher_xem_truoc" in tools):
            return Plan(
                module=module,
                intent="ap_voucher_xem_truoc",
                needs_clarification=False,
                clarifying_question=None,
                steps=[{"id": "s1", "tool": "ap_voucher_xem_truoc", "args": {"code": code, "order_amount": amount}, "save_as": None}],
                final_response_template=None,
            )

        # không có amount => hỏi lại
        if "kiem_tra_voucher_hop_le" in tools:
            return Plan(
                module=module,
                intent="voucher_thieu_order_amount",
                needs_clarification=True,
                clarifying_question="Bạn cho mình giá trị đơn hàng (order_amount) hoặc mã đơn hàng (#123) để kiểm tra/preview voucher.",
                steps=[],
                final_response_template=None,
            )

    # =========================
    # 6) SẢN PHẨM theo product_id
    # =========================
    if m_prod:
        product_id = int(m_prod.group(1))

        if ("thong_tin_san_pham" in tools) and _has_any(low, ["thuộc hãng", "hang", "brand", "giá", "gia", "còn bán", "con ban", "active"]):
            return Plan(
                module=module,
                intent="thong_tin_san_pham",
                needs_clarification=False,
                clarifying_question=None,
                steps=[{"id": "s1", "tool": "thong_tin_san_pham", "args": {"product_id": product_id}, "save_as": None}],
                final_response_template=None,
            )

        if ("bien_the_san_pham" in tools) and _has_any(low, ["phiên bản", "phien ban", "biến thể", "bien the", "variant"]):
            return Plan(
                module=module,
                intent="bien_the_san_pham",
                needs_clarification=False,
                clarifying_question=None,
                steps=[{"id": "s1", "tool": "bien_the_san_pham", "args": {"product_id": product_id}, "save_as": None}],
                final_response_template=None,
            )

    # =========================
    # 7) Demo: tìm KH -> list đơn của KH
    # =========================
    if ("tim_khach_hang" in tools) and ("tim_don_hang" in tools) and _has_any(low, ["khách hàng", "khach hang", "sđt", "dien thoai", "email"]):
        keyword = msg
        return Plan(
            module=module,
            intent="tim_khach_hang_va_don_hang",
            needs_clarification=False,
            clarifying_question=None,
            steps=[
                {"id": "s1", "tool": "tim_khach_hang", "args": {"keyword": keyword, "limit": 5}, "save_as": "customers"},
                {"id": "s2", "tool": "tim_don_hang", "args": {"target_user_id": "{{customers[0].user_id}}", "limit": 10}, "save_as": None},
            ],
            final_response_template=None,
        )

    # =========================
    # 8) FALLBACK: Gemini 
    # =========================
    return gemini_fallback(module, msg, auth, extra_hints=[
        "Đơn hàng: tra_cuu_trang_thai_don_hang(order_id, target_user_id) hoặc chi_tiet_don_hang(order_id, target_user_id).",
        "Thanh toán: trang_thai_thanh_toan_theo_don(order_id, target_user_id). Có lỗi giao dịch: tim_giao_dich_loi(from_date, to_date, limit).",
        "Lịch sử/chi tiêu: lich_su_mua_hang(target_user_id, limit) / tong_tien_mua_hang(target_user_id, from_date, to_date) / thong_ke_mua_theo_hang(target_user_id, limit).",
        "Voucher: xem_chi_tiet_voucher(code) / kiem_tra_voucher_hop_le(code, order_amount) / ap_voucher_xem_truoc(code, order_amount) / goi_y_voucher_tot_nhat(order_amount, limit) / danh_sach_voucher_dang_active(limit).",
        "Sản phẩm: tim_san_pham(keyword, only_active, limit) -> thong_tin_san_pham(product_id) / bien_the_san_pham(product_id) / kiem_tra_ton_kho_bien_the(product_variant_id) / top_san_pham_ban_chay(limit).",
        "CS/Sale tìm người A/B: tim_khach_hang(keyword) rồi tra cứu theo target_user_id.",
    ])