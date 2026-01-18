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
        "Danh mục: tai_khoan(tu_khoa, loai, chi_hien_hoat_dong), ky_hien_tai(ngay), ds_ky(status).",
        "Đối tác: doi_tac(partner_type, external_id, tu_khoa).",
        "Hóa đơn: ar_hd/ar_ct(invoice_id | sales_order_ref), ap_hd/ap_ct(invoice_id | purchase_order_ref).",
        "Công nợ: ar_no(external_id?), ap_no(external_id?).",
        "Thu–Chi: giao_dich(loai, phuong_thuc, tu_ngay, den_ngay), dong_tien(tu_ngay, den_ngay).",
        "Sổ sách: so_nhat_ky(tu_ngay, den_ngay, status, source_module), but_toan(entry_id|reference_no), so_du(account_code, tu_ngay, den_ngay).",
        "Tri thức: tra_cuu_kho_tri_thuc(tu_khoa). Rule: giai_thich_rule(event_code).",
        "Nếu câu hỏi có 2 ý (multi-part) thì lập plan 2–3 step, step2 có thể dùng {{s1.data...}}.",
    ])