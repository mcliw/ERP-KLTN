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

def plan_route_sale_crm(module: str, message: str, auth: dict) -> Plan:
    msg = (message or "").strip()
    low = msg.lower()
    tools = _toolset()

    uid = auth.get("user_id")

    m_order = _ORDER_ID_RE.search(msg)
    m_voucher = _VOUCHER_RE.search(msg)
    m_prod = _PRODUCT_ID_RE.search(msg)

    wants_status = any(k in low for k in ["trạng thái", "tình trạng", "đang ở đâu", "giao chưa", "da giao", "ship", "shipping"])
    wants_detail = any(k in low for k in ["chi tiết", "chi tiet", "gồm", "gom", "mua những gì", "co nhung san pham"])
    wants_payment = any(k in low for k in ["thanh toán", "thanh toán chưa","thanh toan chua", "đã thanh toán", "da thanh toan", "thanh toan", "payment", "trả tiền", "tra tien", "bị trừ", "bi tru"])
    wants_history = any(k  in low for k in ["lịch sử", "lich su", "đã mua", "da mua", "mua trước", "mua truoc"])
    wants_preview = any(k in low for k in ["áp", "ap", "preview", "còn bao nhiêu", "con bao nhieu", "giảm bao nhiêu", "giam bao nhieu"])
    wants_latest_order = any(k in low for k in ["gần nhất", "mới nhất", "recent", "latest", "đơn gần nhất", "don gan nhat"])

    # 1) Đơn hàng: status / detail / payment
    if m_order:
        order_id = int(m_order.group(1))

        # status
        if wants_status and "tra_cuu_trang_thai_don_hang" in tools:
            return Plan(
                module=module,
                intent="tra_cuu_trang_thai_don_hang",
                needs_clarification=False,
                clarifying_question=None,
                steps=[{"id": "s1", "tool": "tra_cuu_trang_thai_don_hang", "args": {"order_id": order_id, "target_user_id": uid}, "save_as": None}],
                final_response_template=None,
            )

        # detail
        if wants_detail and "chi_tiet_don_hang" in tools:
            return Plan(
                module=module,
                intent="chi_tiet_don_hang",
                needs_clarification=False,
                clarifying_question=None,
                steps=[{"id": "s1", "tool": "chi_tiet_don_hang", "args": {"order_id": order_id, "target_user_id": uid}, "save_as": "order_detail"}],
                final_response_template=None,
            )

        # payment by order
        if wants_payment and "trang_thai_thanh_toan_theo_don" in tools:
            return Plan(
                module=module,
                intent="trang_thai_thanh_toan_theo_don",
                needs_clarification=False,
                clarifying_question=None,
                steps=[{"id": "s1", "tool": "trang_thai_thanh_toan_theo_don", "args": {"order_id": order_id, "target_user_id": uid}, "save_as": None}],
                final_response_template=None,
            )

        # 1b) Đơn hàng gần nhất
        if wants_latest_order and ("don_hang_gan_nhat" in tools):
            if not uid:
                return Plan(
                    module=module,
                    intent="don_hang_gan_nhat",
                    needs_clarification=True,
                    clarifying_question="Bạn vui lòng cung cấp mã khách hàng/số điện thoại (hoặc đăng nhập) để mình lấy đơn hàng gần nhất.",
                    steps=[],
                    final_response_template=None,
                )
            return Plan(
                module=module,
                intent="don_hang_gan_nhat",
                needs_clarification=False,
                clarifying_question=None,
                steps=[{
                    "id": "s1",
                    "tool": "don_hang_gan_nhat",
                    "args": {"target_user_id": uid},
                    "save_as": None
                }],
                final_response_template=None,
            )
        
        if ("don_hang_gan_nhat" in tools) and wants_payment and ("trang_thai_thanh_toan_theo_don" in tools):
            return Plan(
                module=module,
                intent="don_gan_nhat_va_thanh_toan",
                needs_clarification=False,
                clarifying_question=None,
                steps=[
                    {"id": "s1", "tool": "don_hang_gan_nhat",
                    "args": {"target_user_id": uid}, "save_as": "latest_order"},
                    {"id": "s2", "tool": "trang_thai_thanh_toan_theo_don",
                    "args": {"order_id": "{{latest_order.order_id}}", "target_user_id": uid},
                    "save_as": "payment_status"},
                ],
                final_response_template=None,
            )
        
    # Ưu tiên report: "hãng nào mua nhiều nhất"
    wants_top_brand = (
        ("hãng" in low or "hang" in low or "brand" in low)
        and ("nhiều nhất" in low or "nhieu nhat" in low or "mua nhiều" in low or "mua nhieu" in low)
    )

    if wants_top_brand and uid:
        return Plan(
            module="sale_crm",
            intent="hang_mua_nhieu_nhat",
            needs_clarification=False,
            clarifying_question=None,
            steps=[
                {"id": "s1", "tool": "hang_mua_nhieu_nhat", "args": {"target_user_id": uid, "limit": 10}, "save_as": None}
            ],
            final_response_template=None,
        )

    # 2) Lịch sử mua
    if wants_history and "lich_su_mua_hang" in tools:
        return Plan(
            module=module,
            intent="lich_su_mua_hang",
            needs_clarification=False,
            clarifying_question=None,
            steps=[{"id": "s1", "tool": "lich_su_mua_hang", "args": {"target_user_id": uid, "limit": 20}, "save_as": None}],
            final_response_template=None,
        )

    # 3) Voucher: kiểm tra / preview
    if m_voucher:
        code = m_voucher.group(1).upper()

        # Nếu user hỏi "áp mã cho đơn #..." => lấy total đơn rồi preview
        if m_order and wants_preview and "chi_tiet_don_hang" in tools and "ap_voucher_xem_truoc" in tools:
            order_id = int(m_order.group(1))
            return Plan(
                module=module,
                intent="ap_voucher_cho_don",
                needs_clarification=False,
                clarifying_question=None,
                steps=[
                    {"id": "s1", "tool": "chi_tiet_don_hang", "args": {"order_id": order_id, "target_user_id": uid}, "save_as": "order_detail"},
                    {"id": "s2", "tool": "ap_voucher_xem_truoc", "args": {"code": code, "order_amount": "{{order_detail.total_amount}}", "target_user_id": uid}, "save_as": None},
                ],
                final_response_template=None,
            )
        
        # Có amount trong câu => preview luôn
        m_money = re.search(r"(?<![A-Za-z])(\d{4,}|\d{1,3}(?:[.,]\d{3})+)(?![A-Za-z])", msg)
        if m_money and ("ap_voucher_xem_truoc" in tools):
            raw = m_money.group(1).replace(".", "").replace(",", "")
            try:
                amount = float(raw)
                return Plan(
                    module=module,
                    intent="ap_voucher_xem_truoc",
                    needs_clarification=False,
                    clarifying_question=None,
                    steps=[{
                        "id": "s1",
                        "tool": "ap_voucher_xem_truoc",
                        "args": {"code": code, "order_amount": amount, "target_user_id": uid},
                        "save_as": None
                    }],
                    final_response_template=None,
                )
            except Exception:
                pass

        # Không có amount => hỏi làm rõ
        if "kiem_tra_voucher_hop_le" in tools:
            return Plan(
                module=module,
                intent="voucher_thieu_order_amount",
                needs_clarification=True,
                clarifying_question="Bạn cho mình giá trị đơn hàng (order_amount) hoặc mã đơn hàng để kiểm tra/preview voucher.",
                steps=[],
                final_response_template=None,
            )


    # 4) Sản phẩm: thông tin / biến thể
    if m_prod:
        product_id = int(m_prod.group(1))
        if ("thong_tin_san_pham" in tools) and any(k in low for k in ["thuộc hãng", "hang", "giá", "gia", "còn bán", "con ban", "active"]):
            return Plan(
                module=module,
                intent="thong_tin_san_pham",
                needs_clarification=False,
                clarifying_question=None,
                steps=[{"id": "s1", "tool": "thong_tin_san_pham", "args": {"product_id": product_id}, "save_as": None}],
                final_response_template=None,
            )
        if ("bien_the_san_pham" in tools) and any(k in low for k in ["phiên bản", "phien ban", "biến thể", "bien the", "variant"]):
            return Plan(
                module=module,
                intent="bien_the_san_pham",
                needs_clarification=False,
                clarifying_question=None,
                steps=[{"id": "s1", "tool": "bien_the_san_pham", "args": {"product_id": product_id}, "save_as": None}],
                final_response_template=None,
            )

    # 5) Demo hỏi “A/B”: tìm KH -> tìm đơn hàng của KH
    # (Ví dụ: "tìm khách hàng sđt 09... rồi xem đơn gần nhất")
    if ("tim_khach_hang" in tools) and ("tim_don_hang" in tools) and any(k in low for k in ["khách hàng", "khach hang", "sđt", "dien thoai", "email"]):
        # keyword lấy theo toàn câu (Gemini sẽ tốt hơn), nhưng nếu muốn rule cứng:
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
    
    # uid là user_id từ request (auth/user_id)
    uid = auth.get("user_id") if isinstance(auth, dict) else user_id  # tuỳ code bạn

    low = message.lower()

    wants_latest_order = any(k in low for k in [
        "đơn hàng gần nhất", "don hang gan nhat",
        "đơn gần nhất", "mới nhất", "gần nhất",
        "latest order", "recent order"
    ])

    if wants_latest_order:
        return Plan(
            module="sale_crm",
            intent="don_hang_gan_nhat",
            needs_clarification=False,
            clarifying_question=None,
            steps=[
                {
                    "id": "s1",
                    "tool": "don_hang_gan_nhat",
                    "args": {"target_user_id": uid},
                    "save_as": None
                }
            ],
            final_response_template=None,
        )

    low = msg.lower()
    uid = auth.get("user_id")
    role = auth.get("role")

    m = re.search(r"(?:đơn hàng|don hang|order)\s*(?:số\s*)?(\d+)", low)
    order_id = int(m.group(1)) if m else None

    wants_owner = any(k in low for k in ["của ai", "ai đặt", "ai mua", "belongs to who"])

    if order_id and wants_owner:
        # CUSTOMER chỉ được xem đơn của chính mình => ép target_user_id = uid
        target_uid = uid if role == "CUSTOMER" else None

        return Plan(
            module="sale_crm",
            intent="chu_don_hang",
            needs_clarification=False,
            clarifying_question=None,
            steps=[{
                "id": "s1",
                "tool": "chu_don_hang",
                "args": {"order_id": order_id, "target_user_id": target_uid},
                "save_as": None
            }],
            final_response_template=None,
        )

    return gemini_fallback(module, msg, auth, extra_hints=[
        "Đơn hàng: tra_cuu_trang_thai_don_hang(order_id, target_user_id) hoặc chi_tiet_don_hang(order_id, target_user_id).",
        "Thanh toán: trang_thai_thanh_toan_theo_don(order_id, target_user_id).",
        "Lịch sử mua: lich_su_mua_hang(target_user_id, limit) / tong_tien_mua_hang(...).",
        "Voucher: kiem_tra_voucher_hop_le(code, order_amount, target_user_id) và ap_voucher_xem_truoc(code, order_amount, target_user_id).",
        "Sản phẩm: thong_tin_san_pham(product_id), bien_the_san_pham(product_id), tim_san_pham(keyword...).",
        "CS/Sale tìm người A/B: tim_khach_hang(keyword) rồi tra cứu theo target_user_id.",
    ])