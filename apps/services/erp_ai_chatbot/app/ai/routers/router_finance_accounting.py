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

    # 9) fallback: Gemini router theo schema + tool enum
    return gemini_fallback(module, msg, auth, extra_hints=[
        "Danh mục: coa_danh_muc(limit), coa_tim(tu_khoa), coa_chi_tiet(account_code), ky_hien_tai(as_of), ky_danh_sach(status).",
        "Đối tác: bp_tim(partner_type, external_id, tu_khoa), bp_chi_tiet(partner_type, external_id).",
        "Hóa đơn: ar_danh_sach(external_id, payment_status, from_date, to_date), ar_trang_thai/ar_chi_tiet(invoice_id|ref). ap_danh_sach(...), ap_trang_thai/ap_chi_tiet(invoice_id|ref).",
        "Công nợ: ar_no(external_id?), ap_no(external_id?).",
        "Thu–Chi: cash_lich_su(from_date, to_date, transaction_type, payment_method, limit), cash_chi_tiet(transaction_id|reference_doc_id), cash_tong_hop_thang(month, year).",
        "Sổ sách: je_danh_sach(from_date, to_date, status, source_module, limit), je_chi_tiet(entry_id|reference_no), so_du_tk(account_code, from_date, to_date), so_cai_tk(account_code, from_date, to_date, limit).",
        "Tri thức: tra_cuu_kho_tri_thuc(tu_khoa). Rule: rule_giai_thich(event_code) hoặc rule_chi_tiet(event_code).",
        "Nếu câu hỏi có 2 ý (multi-part) thì lập plan 2–3 step, step2 có thể dùng {{s1.data...}}.",
    ])