from __future__ import annotations

import re
from datetime import date

from app.ai.plan_schema import Plan
from app.ai.routers.common import gemini_fallback, build_system_instruction


# -------- helpers --------
_RE_SO = re.compile(r"\bSO[-_A-Z0-9]+\b", re.IGNORECASE)
_RE_PO = re.compile(r"\bPO[-_A-Z0-9]+\b", re.IGNORECASE)
_RE_EVENT = re.compile(r"\b[A-Z][A-Z0-9_]{2,}\b")
_RE_EXTID = re.compile(r"\b[A-Z]{2,6}\d{1,10}\b")  # KH001, NCC02, CUS123...

_RE_INVOICE_ID = re.compile(
    r"(?:invoice\s*id|invoice_id|mã\s*hóa\s*đơn|hoa\s*don|id)\s*[:#]?\s*(\d+)",
    re.IGNORECASE,
)

_RE_DDMMYYYY = re.compile(r"(\d{1,2})/(\d{1,2})/(\d{4})")
_RE_RANGE = re.compile(r"(?:từ|tu)\s*(\d{1,2}/\d{1,2}/\d{4}).*(?:đến|den)\s*(\d{1,2}/\d{1,2}/\d{4})", re.IGNORECASE)


def _ddmmyyyy_to_iso(s: str) -> str | None:
    m = _RE_DDMMYYYY.search(s or "")
    if not m:
        return None
    d, mth, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
    try:
        return date(y, mth, d).isoformat()
    except Exception:
        return None


def _parse_date_range(msg: str) -> tuple[str | None, str | None]:
    m = _RE_RANGE.search(msg or "")
    if not m:
        return None, None
    return _ddmmyyyy_to_iso(m.group(1)), _ddmmyyyy_to_iso(m.group(2))


def _infer_partner_type(low: str) -> str | None:
    if any(k in low for k in ["khách hàng", "khach hang", "customer", "cus"]):
        return "CUSTOMER"
    if any(k in low for k in ["nhà cung cấp", "nha cung cap", "supplier", "sup", "ncc"]):
        return "SUPPLIER"
    return None


def _wants_detail(low: str) -> bool:
    return any(k in low for k in ["chi tiết", "chi tiet", "detail", "xem chi tiết"])


def _wants_status(low: str) -> bool:
    return any(k in low for k in ["trạng thái", "tình trạng", "status", "đang ở"])


# -------- router --------
def plan_route_finance_accounting(module: str, message: str, auth: dict) -> Plan:
    msg = (message or "").strip()
    low = msg.lower()

    # # 0) Tri thức nội bộ (RAG-lite): chính sách/quy trình/hướng dẫn/FAQ...
    # if should_use_rag(msg) or any(k in low for k in ["quy trình", "huong dan", "hướng dẫn", "faq", "chính sách", "chinh sach"]):
    #     return Plan(
    #         module=module,
    #         intent="tra_cuu_kho_tri_thuc",
    #         needs_clarification=False,
    #         clarifying_question=None,
    #         steps=[
    #             {"id": "s1", "tool": "tra_cuu_kho_tri_thuc", "args": {"tu_khoa": msg, "limit": 5, "max_chars": 800}, "save_as": "kb"},
    #         ],
    #         final_response_template=None,
    #     )

    # 1) Danh mục: kỳ kế toán
    # if any(k in low for k in ["kỳ hiện tại", "ky hien tai", "kỳ kế toán hiện tại", "period hiện tại"]):
    #     return Plan(
    #         module=module,
    #         intent="ky_hien_tai",
    #         needs_clarification=False,
    #         clarifying_question=None,
    #         steps=[{"id": "s1", "tool": "ky_hien_tai", "args": {}, "save_as": None}],
    #         final_response_template=None,
    #     )

    # if any(k in low for k in ["danh sách kỳ", "ds kỳ", "ds ky", "các kỳ", "cac ky", "fiscal periods"]):
    #     status = None
    #     if any(k in low for k in ["đóng", "da dong", "closed"]):
    #         status = "CLOSED"
    #     if any(k in low for k in ["mở", "mo", "open"]):
    #         status = "OPEN"
    #     args = {"limit": 24}
    #     if status:
    #         args["status"] = status
    #     return Plan(
    #         module=module,
    #         intent="ds_ky",
    #         needs_clarification=False,
    #         clarifying_question=None,
    #         steps=[{"id": "s1", "tool": "ds_ky", "args": args, "save_as": None}],
    #         final_response_template=None,
    #     )

    # # 2) Danh mục: tài khoản (COA)
    # if any(k in low for k in ["tài khoản", "tai khoan", "coa", "chart of accounts", "account"]):
    #     # cố lấy "mã tài khoản"
    #     code = None
    #     mcode = re.search(r"(?:tài khoản|tai khoan|tk)\s*[:#]?\s*(\d{3,10})", low)
    #     if mcode:
    #         code = mcode.group(1)
    #     if code:
    #         return Plan(
    #             module=module,
    #             intent="tai_khoan",
    #             needs_clarification=False,
    #             clarifying_question=None,
    #             steps=[{"id": "s1", "tool": "tai_khoan", "args": {"tu_khoa": code, "limit": 20}, "save_as": None}],
    #             final_response_template=None,
    #         )
    #     # list/search theo keyword còn lại
    #     kw = None
    #     # ví dụ "tài khoản tiền mặt"
    #     mkw = re.search(r"(?:tài khoản|tai khoan)\s+(.*)$", msg, re.IGNORECASE)
    #     if mkw:
    #         kw = mkw.group(1).strip()
    #     return Plan(
    #         module=module,
    #         intent="tai_khoan",
    #         needs_clarification=False,
    #         clarifying_question=None,
    #         steps=[{"id": "s1", "tool": "tai_khoan", "args": {"tu_khoa": kw, "limit": 50}, "save_as": None}],
    #         final_response_template=None,
    #     )

    # # 3) Đối tác
    # if any(k in low for k in ["đối tác", "doi tac", "khách hàng", "khach hang", "nhà cung cấp", "nha cung cap", "supplier", "customer"]):
    #     ptype = _infer_partner_type(low)
    #     ext = None
    #     # ưu tiên code sau chữ "mã"
    #     m = re.search(r"(?:mã|ma)\s*[:#]?\s*([A-Z]{2,6}\d{1,10})", msg, re.IGNORECASE)
    #     if m:
    #         ext = m.group(1).upper()
    #     else:
    #         m2 = _RE_EXTID.search(msg)
    #         if m2:
    #             ext = m2.group(0).upper()

    #     # nếu có ext => detail; nếu không => search theo từ khóa
    #     if ext:
    #         args = {"external_id": ext}
    #         if ptype:
    #             args["partner_type"] = ptype
    #         return Plan(
    #             module=module,
    #             intent="doi_tac",
    #             needs_clarification=False,
    #             clarifying_question=None,
    #             steps=[{"id": "s1", "tool": "doi_tac", "args": args, "save_as": "doi_tac"}],
    #             final_response_template=None,
    #         )

    #     # search theo phần message
    #     return Plan(
    #         module=module,
    #         intent="doi_tac",
    #         needs_clarification=False,
    #         clarifying_question=None,
    #         steps=[{"id": "s1", "tool": "doi_tac", "args": {"tu_khoa": msg, "limit": 10}, "save_as": None}],
    #         final_response_template=None,
    #     )

    # # 4) Công nợ AR/AP
    # if any(k in low for k in ["công nợ", "cong no", "aging", "phải thu", "phai thu", "phải trả", "phai tra"]):
    #     ext = None
    #     m = _RE_EXTID.search(msg)
    #     if m:
    #         ext = m.group(0).upper()

    #     if any(k in low for k in ["phải thu", "phai thu", "ar"]):
    #         args = {"top": 20}
    #         if ext:
    #             args["external_id"] = ext
    #         return Plan(
    #             module=module,
    #             intent="ar_no",
    #             needs_clarification=False,
    #             clarifying_question=None,
    #             steps=[{"id": "s1", "tool": "ar_no", "args": args, "save_as": None}],
    #             final_response_template=None,
    #         )

    #     if any(k in low for k in ["phải trả", "phai tra", "ap"]):
    #         args = {"top": 20}
    #         if ext:
    #             args["external_id"] = ext
    #         return Plan(
    #             module=module,
    #             intent="ap_no",
    #             needs_clarification=False,
    #             clarifying_question=None,
    #             steps=[{"id": "s1", "tool": "ap_no", "args": args, "save_as": None}],
    #             final_response_template=None,
    #         )

    #     # chung chung -> hỏi làm rõ
    #     return Plan(
    #         module=module,
    #         intent="cong_no_can_lam_ro",
    #         needs_clarification=True,
    #         clarifying_question="Bạn muốn xem công nợ *phải thu (AR)* hay *phải trả (AP)*?",
    #         steps=[],
    #         final_response_template=None,
    #     )

    # # 5) Hóa đơn AR/AP
    # if any(k in low for k in ["hóa đơn", "hoa don", "invoice"]):
    #     inv_id = None
    #     m_id = _RE_INVOICE_ID.search(msg)
    #     if m_id:
    #         inv_id = int(m_id.group(1))

    #     so = _RE_SO.search(msg)
    #     po = _RE_PO.search(msg)

    #     is_ar = any(k in low for k in ["ar", "phải thu", "phai thu", "doanh thu"])
    #     is_ap = any(k in low for k in ["ap", "phải trả", "phai tra", "chi phí", "chi phi"])

    #     # nếu có SO => AR
    #     if so:
    #         tool = "ar_ct" if _wants_detail(low) else "ar_hd"
    #         return Plan(
    #             module=module,
    #             intent=tool,
    #             needs_clarification=False,
    #             clarifying_question=None,
    #             steps=[{"id": "s1", "tool": tool, "args": {"sales_order_ref": so.group(0).upper()}, "save_as": None}],
    #             final_response_template=None,
    #         )

    #     # nếu có PO => AP
    #     if po:
    #         tool = "ap_ct" if _wants_detail(low) else "ap_hd"
    #         return Plan(
    #             module=module,
    #             intent=tool,
    #             needs_clarification=False,
    #             clarifying_question=None,
    #             steps=[{"id": "s1", "tool": tool, "args": {"purchase_order_ref": po.group(0).upper()}, "save_as": None}],
    #             final_response_template=None,
    #         )

    #     # nếu có invoice_id thì dựa theo AR/AP keyword (nếu không có thì hỏi)
    #     if inv_id is not None:
    #         if is_ar and not is_ap:
    #             tool = "ar_ct" if _wants_detail(low) else "ar_hd"
    #             return Plan(
    #                 module=module,
    #                 intent=tool,
    #                 needs_clarification=False,
    #                 clarifying_question=None,
    #                 steps=[{"id": "s1", "tool": tool, "args": {"invoice_id": inv_id}, "save_as": None}],
    #                 final_response_template=None,
    #             )
    #         if is_ap and not is_ar:
    #             tool = "ap_ct" if _wants_detail(low) else "ap_hd"
    #             return Plan(
    #                 module=module,
    #                 intent=tool,
    #                 needs_clarification=False,
    #                 clarifying_question=None,
    #                 steps=[{"id": "s1", "tool": tool, "args": {"invoice_id": inv_id}, "save_as": None}],
    #                 final_response_template=None,
    #             )

    #         return Plan(
    #             module=module,
    #             intent="hoa_don_can_lam_ro",
    #             needs_clarification=True,
    #             clarifying_question="Invoice_id này thuộc AR (phải thu) hay AP (phải trả)? Bạn cho biết AR/AP để mình tra đúng.",
    #             steps=[],
    #             final_response_template=None,
    #         )

    #     # thiếu ref
    #     return Plan(
    #         module=module,
    #         intent="hoa_don_thieu_thong_tin",
    #         needs_clarification=True,
    #         clarifying_question="Bạn cung cấp *invoice_id* hoặc *sales_order_ref (SO-...)* hoặc *purchase_order_ref (PO-...)* để tra hóa đơn.",
    #         steps=[],
    #         final_response_template=None,
    #     )

    # # 6) Thu–Chi
    # if any(k in low for k in ["dòng tiền", "dong tien", "cashflow", "tổng thu", "tong thu", "tổng chi", "tong chi", "net"]):
    #     tu_ngay, den_ngay = _parse_date_range(msg)
    #     args = {}
    #     if tu_ngay:
    #         args["tu_ngay"] = tu_ngay
    #     if den_ngay:
    #         args["den_ngay"] = den_ngay
    #     return Plan(
    #         module=module,
    #         intent="dong_tien",
    #         needs_clarification=False,
    #         clarifying_question=None,
    #         steps=[{"id": "s1", "tool": "dong_tien", "args": args, "save_as": None}],
    #         final_response_template=None,
    #     )

    # if any(k in low for k in ["giao dịch", "giao dich", "thu chi", "thu/chi", "receipt", "payment"]):
    #     tu_ngay, den_ngay = _parse_date_range(msg)
    #     args = {"limit": 50}
    #     if tu_ngay:
    #         args["tu_ngay"] = tu_ngay
    #     if den_ngay:
    #         args["den_ngay"] = den_ngay

    #     if any(k in low for k in ["thu", "receipt"]):
    #         args["loai"] = "RECEIPT"
    #     if any(k in low for k in ["chi", "payment"]):
    #         args["loai"] = "PAYMENT"
    #     if any(k in low for k in ["tiền mặt", "tien mat", "cash"]):
    #         args["phuong_thuc"] = "CASH"
    #     if any(k in low for k in ["chuyển khoản", "chuyen khoan", "bank"]):
    #         args["phuong_thuc"] = "BANK_TRANSFER"

    #     return Plan(
    #         module=module,
    #         intent="giao_dich",
    #         needs_clarification=False,
    #         clarifying_question=None,
    #         steps=[{"id": "s1", "tool": "giao_dich", "args": args, "save_as": None}],
    #         final_response_template=None,
    #     )

    # # 7) Sổ sách
    # if any(k in low for k in ["sổ nhật ký", "so nhat ky", "journal entries", "nhật ký chung"]):
    #     tu_ngay, den_ngay = _parse_date_range(msg)
    #     args = {"limit": 50}

    #     if tu_ngay:
    #         args["tu_ngay"] = tu_ngay
    #     if den_ngay:
    #         args["den_ngay"] = den_ngay

    #     if any(k in low for k in ["posted", "đã ghi sổ", "da ghi so"]):
    #         args["status"] = "POSTED"
    #     if any(k in low for k in ["draft", "nháp", "nhap"]):
    #         args["status"] = "DRAFT"

    #     if any(k in low for k in ["sales", "bán hàng", "ban hang"]):
    #         args["source_module"] = "SALES"
    #     elif any(k in low for k in ["purchase", "mua hàng", "mua hang"]):
    #         args["source_module"] = "PURCHASE"
    #     elif any(k in low for k in ["cash", "tiền", "tien"]):
    #         args["source_module"] = "CASH"
    #     elif "manual" in low:
    #         args["source_module"] = "MANUAL"

    #     return Plan(
    #         module=module,
    #         intent="so_nhat_ky",
    #         needs_clarification=False,
    #         clarifying_question=None,
    #         steps=[{"id": "s1", "tool": "so_nhat_ky", "args": args, "save_as": None}],
    #         final_response_template=None,
    #     )

    # if "bút toán" in low or "but toan" in low:
    #     # entry_id hoặc reference_no
    #     entry_id = None
    #     m = re.search(r"(?:entry_id|entry id|bút toán|but toan)\s*[:#]?\s*(\d{3,})", low)
    #     if m:
    #         entry_id = int(m.group(1))
    #     ref = None
    #     mref = re.search(r"(?:reference|ref|số tham chiếu|so tham chieu)\s*[:#]?\s*([A-Z0-9-_]+)", msg, re.IGNORECASE)
    #     if mref:
    #         ref = mref.group(1)

    #     if entry_id is None and not ref:
    #         return Plan(
    #             module=module,
    #             intent="but_toan_thieu_thong_tin",
    #             needs_clarification=True,
    #             clarifying_question="Bạn cung cấp *entry_id* hoặc *reference_no* để tra chi tiết bút toán.",
    #             steps=[],
    #             final_response_template=None,
    #         )

    #     args = {}
    #     if entry_id is not None:
    #         args["entry_id"] = entry_id
    #     if ref:
    #         args["reference_no"] = ref
    #     return Plan(
    #         module=module,
    #         intent="but_toan",
    #         needs_clarification=False,
    #         clarifying_question=None,
    #         steps=[{"id": "s1", "tool": "but_toan", "args": args, "save_as": None}],
    #         final_response_template=None,
    #     )

    # if any(k in low for k in ["số dư", "so du", "balance"]):
    #     acc = None
    #     macc = re.search(r"(?:tài khoản|tai khoan|tk)\s*[:#]?\s*(\d{3,10})", low)
    #     if macc:
    #         acc = macc.group(1)

    #     if not acc:
    #         return Plan(
    #             module=module,
    #             intent="so_du_thieu_tai_khoan",
    #             needs_clarification=True,
    #             clarifying_question="Bạn muốn xem số dư của *tài khoản nào*? (ví dụ: TK 111, 112, 131...)",
    #             steps=[],
    #             final_response_template=None,
    #         )

    #     tu_ngay, den_ngay = _parse_date_range(msg)
    #     args = {"account_code": acc, "limit": 50}
    #     if tu_ngay:
    #         args["tu_ngay"] = tu_ngay
    #     if den_ngay:
    #         args["den_ngay"] = den_ngay

    #     return Plan(
    #         module=module,
    #         intent="so_du",
    #         needs_clarification=False,
    #         clarifying_question=None,
    #         steps=[{"id": "s1", "tool": "so_du", "args": args, "save_as": None}],
    #         final_response_template=None,
    #     )

    # # 8) Giải thích rule định khoản
    # if any(k in low for k in ["giai thích", "giải thích", "định khoản", "dinh khoan", "posting rule", "event_code", "event code"]):
    #     m = _RE_EVENT.search(msg)
    #     if not m:
    #         return Plan(
    #             module=module,
    #             intent="giai_thich_rule_thieu_event",
    #             needs_clarification=True,
    #             clarifying_question="Bạn cung cấp *event_code* (ví dụ: SALES_INVOICE_POST) để mình giải thích rule.",
    #             steps=[],
    #             final_response_template=None,
    #         )
    #     event_code = m.group(0).upper()
    #     return Plan(
    #         module=module,
    #         intent="giai_thich_rule",
    #         needs_clarification=False,
    #         clarifying_question=None,
    #         steps=[{"id": "s1", "tool": "giai_thich_rule", "args": {"event_code": event_code}, "save_as": None}],
    #         final_response_template=None,
    #     )

    # 9) fallback: Gemini router theo schema + tool enum
    return gemini_fallback(module, msg, auth, extra_hints=[
        "Danh mục: tai_khoan(tu_khoa, loai, chi_hien_hoat_dong), ky_hien_tai(ngay), ds_ky(status).",
        "Đối tác: doi_tac(partner_type, external_id, tu_khoa).",
        "Hóa đơn: ar_hd/ar_ct(invoice_id | sales_order_ref), ap_hd/ap_ct(invoice_id | purchase_order_ref).",
        "Công nợ: ar_no(external_id?), ap_no(external_id?).",
        "Thu–Chi: giao_dich(loai, phuong_thuc, tu_ngay, den_ngay), dong_tien(tu_ngay, den_ngay).",
        "Sổ sách: so_nhat_ky(tu_ngay, den_ngay, status, source_module), but_toan(entry_id|reference_no), so_du(account_code, tu_ngay, den_ngay).",
        "Tri thức: tra_cuu_kho_tri_thuc(tu_khoa). Rule: giai_thich_rule(event_code).",
        "Nếu câu hỏi có 2 ý (multi-part) thì lập plan 2–3 step, step2 có thể dùng {{s1.data...}}.",
    ])
