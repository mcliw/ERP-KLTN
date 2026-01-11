from __future__ import annotations

import json
import os
import re
from copy import deepcopy
from typing import Dict, Any

from dotenv import load_dotenv
from google import genai
from proto import module

from app.ai.plan_schema import Plan
from app.ai.module_registry import list_tools

load_dotenv()

_GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
_GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
_client = genai.Client(api_key=_GEMINI_API_KEY) if _GEMINI_API_KEY else genai.Client()

VALID_MODULES = {"supply_chain", "sale_crm", "hrm", "finance_accounting"}

PLAN_JSON_SCHEMA_BASE: Dict[str, Any] = {
    "type": "object",
    "required": ["module", "intent", "needs_clarification", "steps", "final_response_template"],
    "properties": {
        "module": {"type": "string"},
        "intent": {"type": "string"},
        "needs_clarification": {"type": "boolean"},
        "clarifying_question": {"type": ["string", "null"]},
        "steps": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["id", "tool", "args"],
                "properties": {
                    "id": {"type": "string", "pattern": "^s[0-9]+$"},
                    "tool": {"type": "string"},
                    "args": {"type": "object"},
                    "save_as": {"type": ["string", "null"]},
                },
            },
        },
        # ÉP NULL: để tránh LLM sinh template sai; Executor sẽ compose answer từ data
        "final_response_template": {"type": "null"},
    },
}

def _schema_for_module(module: str) -> Dict[str, Any]:
    schema = deepcopy(PLAN_JSON_SCHEMA_BASE)
    schema["properties"]["module"]["enum"] = [module]

    tool_names = [t.ten_tool for t in list_tools(module)]
    schema["properties"]["steps"]["items"]["properties"]["tool"]["enum"] = tool_names
    return schema

def _tool_catalog(module: str) -> str:
    tools = list_tools(module)
    if not tools:
        return "(module chưa có tools)"
    lines = []
    for t in tools:
        fields = []
        for name, f in t.args_model.model_fields.items():
            required = f.is_required()
            ann = getattr(f.annotation, "__name__", str(f.annotation))
            fields.append(f"{name}{'' if required else '?'}:{ann}")
        lines.append(f"- {t.ten_tool}: {t.mo_ta} | args: {', '.join(fields)}")
    return "\n".join(lines)

def _detect_other_module(message: str) -> str | None:
    m = (message or "").lower()
    if any(k in m for k in ["đơn hàng", "khách hàng", "crm", "cskh", "voucher", "giỏ hàng", "đặt hàng"]):
        return "sale_crm"
    if any(k in m for k in ["nhân viên", "lương", "chấm công", "nghỉ phép", "phòng ban", "tuyển dụng"]):
        return "hrm"
    if any(k in m for k in ["hóa đơn", "công nợ", "kế toán", "thu chi", "bút toán", "vat", "đối soát"]):
        return "finance_accounting"
    return None

def _should_use_rag(message: str) -> bool:
    m = (message or "").lower()
    return any(k in m for k in ["chính sách", "bảo hành", "đổi trả", "vận chuyển", "hướng dẫn", "faq", "quy trình"])

def _build_system_instruction(module: str, auth: dict) -> str:
    parts = []
    parts.append("Bạn là Router cho chatbot ERP. Bạn KHÔNG trả lời người dùng trực tiếp.")
    parts.append("Bạn chỉ xuất 1 PLAN JSON theo schema (response_json_schema). Không thêm text ngoài JSON.")
    parts.append("")
    parts.append(f"Module hiện tại: {module}")
    parts.append(f"Role: {auth.get('role')}")
    parts.append("")
    parts.append("Quy tắc bắt buộc:")
    parts.append("1) steps.id luôn là s1, s2, s3... theo thứ tự.")
    parts.append("2) Chỉ dùng tool thuộc module hiện tại (tool đã bị khóa enum).")
    parts.append("3) Thiếu thông tin => needs_clarification=true và đặt clarifying_question.")
    parts.append("4) final_response_template BẮT BUỘC null.")
    parts.append("")
    parts.append("Gợi ý chọn tool:")
    if module == "supply_chain":
        parts.append("- Chính sách/hướng dẫn/FAQ: tra_cuu_kho_tri_thuc.")
        parts.append("- Phiếu nhập gần đây: gr_gan_day (days, limit).")
    elif module == "hrm":
        parts.append("- Tra cứu nhân sự: tra_cuu_nhan_su / ...")
        parts.append("- Chấm công/nghỉ phép/tăng ca: cham_cong / nghi_phep / tang_ca ...")
        parts.append("")
    parts.append("Lưu ý: tool hồ sơ nhân viên trả field 'employee_id' (không dùng 'id').")
    parts.append("Tools khả dụng:")
    parts.append(_tool_catalog(module))
    return "\n".join(parts)

def plan_route(module: str, message: str, auth: dict) -> Plan:
    msg = (message or "").strip()
    low = msg.lower()

    # 0) Validate module trước (an toàn)
    if module not in VALID_MODULES:
        return Plan(
            module=module,
            intent="module_khong_hop_le",
            needs_clarification=True,
            clarifying_question="Module không hợp lệ. Module hợp lệ: supply_chain, sale_crm, hrm, finance_accounting.",
            steps=[],
            final_response_template=None,
        )

    # 1) Detect module khác (user đang hỏi sai module)
    other = _detect_other_module(msg)
    if other and other != module:
        return Plan(
            module=module,
            intent="dieu_huong_module",
            needs_clarification=True,
            clarifying_question=f"Câu hỏi này thuộc module '{other}'. Bạn chuyển chatbot sang '{other}' để tra cứu chính xác.",
            steps=[],
            final_response_template=None,
        )

    # =========================
    # SUPPLY CHAIN RULES
    # =========================
    if module == "supply_chain":
        # PO code (dùng lại nhiều nơi)
        has_po_code = re.search(r"\bpo-\d+\b", msg, re.IGNORECASE)

        # Pattern: hỏi PO sắp đến hạn giao nhất
        is_po_question = any(k in low for k in [
            "po", "đơn mua", "don mua", "đơn đặt mua", "don dat mua", "purchase order"
        ])
        is_deadline = any(k in low for k in [
            "sắp đến hạn", "sap den han",
            "chuẩn bị đến hạn", "chuan bi den han",
            "đến hạn giao", "den han giao",
            "gần đến hạn", "gan den han",
            "etd sớm nhất", "etd som nhat",
            "giao sớm nhất", "giao som nhat",
            "đến hạn giao nhất", "den han giao nhat",
        ])

        wants_progress = any(k in low for k in [
            "tiến độ", "tien do", "tiến độ nhập", "tien do nhap", "nhập đến đâu", "nhap den dau",
            "đã nhận được bao nhiêu", "da nhan duoc bao nhieu",
            "bao nhiêu %", "bao nhieu %", "%"
        ])
        wants_missing = any(k in low for k in [
            "còn thiếu", "con thieu",
            "thiếu hàng", "thieu hang",
            "thiếu sku", "thieu sku",
            "thiếu mặt hàng", "thieu mat hang"
        ])

        # Case A: không có mã PO, hỏi deadline + tiến độ/thiếu => 2 bước
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

        # Case B: có mã PO, hỏi tiến độ/thiếu => gọi thẳng tool tiến độ
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

        # Case C: deadline + hỏi trạng thái
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

        # Case: GR gần đây (không nói theo NCC/PO)
        is_gr_recent = (
            ("phiếu nhập" in low or "phieu nhap" in low or "gr" in low)
            and any(k in low for k in ["gần đây", "gan day", "mới nhất", "moi nhat", "recent"])
        )
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

        # Case: PO -> danh sách GR -> chi tiết GR gần nhất (hỏi SKU trong GR gần nhất)
        wants_gr_list = any(k in low for k in ["phiếu nhập", "phieu nhap", "gr"]) and any(k in low for k in ["danh sách", "danh sach", "list"])
        wants_latest = any(k in low for k in ["gần nhất", "gan nhat", "mới nhất", "moi nhat", "latest"])
        wants_items = any(k in low for k in ["sku", "mặt hàng", "mat hang", "gồm những", "gom nhung", "chi tiết", "chi tiet"])

        if has_po_code and wants_gr_list and wants_latest and wants_items:
            po_code = has_po_code.group(0).upper()
            return Plan(
                module=module,
                intent="gr_gan_nhat_theo_po_va_chi_tiet",
                needs_clarification=False,
                clarifying_question=None,
                steps=[
                    {"id": "s1", "tool": "danh_sach_gr_theo_po", "args": {"po_code": po_code}, "save_as": None},
                    {"id": "s2", "tool": "chi_tiet_phieu_nhap", "args": {"gr_code": "{{s1.data.gr_list[0].gr_code}}"}, "save_as": None},
                ],
                final_response_template=None,
            )

        # Case: SUPxxx + hiệu suất + GR
        sup = re.search(r"\bSUP\d+\b", msg, re.IGNORECASE)
        wants_perf = any(k in low for k in ["hiệu suất giao hàng", "hieu suat giao hang", "hiệu suất", "hieu suat"])
        wants_gr = any(k in low for k in ["phiếu nhập", "phieu nhap", "gr"])
        m_limit = re.search(r"\b(\d+)\b", low)

        if sup and wants_perf and wants_gr:
            supplier_code = sup.group(0).upper()
            limit = int(m_limit.group(1)) if m_limit else 5
            limit = max(1, min(limit, 20))

            return Plan(
                module=module,
                intent="hieu_suat_va_gr_gan_day_theo_ncc",
                needs_clarification=False,
                clarifying_question=None,
                steps=[
                    {"id": "s1", "tool": "hieu_suat_giao_hang_ncc", "args": {"supplier_code": supplier_code}, "save_as": None},
                    {"id": "s2", "tool": "danh_sach_gr_theo_nha_cung_cap", "args": {"supplier_code": supplier_code, "limit": limit}, "save_as": None},
                ],
                final_response_template=None
            )

        # Case: RAG cho supply_chain
        if _should_use_rag(msg):
            return Plan(
                module=module,
                intent="rag",
                needs_clarification=False,
                clarifying_question=None,
                steps=[{
                    "id": "s1",
                    "tool": "tra_cuu_kho_tri_thuc",
                    "args": {"cau_hoi": msg, "top_k": 4},
                    "save_as": None
                }],
                final_response_template=None,
            )
        
    if module == "hrm":
        # bắt mã NV
        m_emp = re.search(r"\bNV\d+\b", msg, re.IGNORECASE)

        # bắt "tháng 10/2025" hoặc "thang 10/2025"
        m_my = re.search(r"(?:tháng|thang)\s*(\d{1,2})\s*/\s*(\d{4})", low)

        wants_summary = any(k in low for k in ["tổng hợp chấm công", "tong hop cham cong"])

        if m_emp and m_my and wants_summary:
            emp_code = m_emp.group(0).upper()
            month = int(m_my.group(1))
            year = int(m_my.group(2))

            return Plan(
                module=module,
                intent="tong_hop_cham_cong_thang",
                needs_clarification=False,
                clarifying_question=None,
                steps=[
                    # lấy employee_id từ mã NV
                    {"id": "s1", "tool": "thong_tin_nhan_vien", "args": {"employee_code": emp_code}, "save_as": None},
                    # gọi tool tổng hợp tháng (NHỚ dùng employee_id, không dùng id)
                    {"id": "s2", "tool": "tong_hop_cham_cong_thang", "args": {"employee_id": "{{s1.data.employee_id}}", "month": month, "year": year}, "save_as": None},
                ],
                final_response_template=None,
            )

    if module == "hrm":
        low = (msg or "").lower()

        emp_m = re.search(r"\bNV\d+\b", msg or "", re.IGNORECASE)
        asks_leave = any(k in low for k in ["nghỉ phép", "nghi phep", "leave"])
        asks_pending = any(k in low for k in ["chờ duyệt", "cho duyet", "pending"])
        asks_detail = any(k in low for k in ["chi tiết", "chi tiet", "detail"])
        asks_latest = any(k in low for k in ["gần nhất", "gan nhat", "mới nhất", "moi nhat", "latest"])

        # NVxxx + nghỉ phép + chờ duyệt + chi tiết đơn gần nhất
        if emp_m and asks_leave and asks_pending and asks_detail and asks_latest:
            emp_code = emp_m.group(0).upper()
            return Plan(
                module=module,
                intent="xem_don_nghi_phep_cho_duyet_gan_nhat",
                needs_clarification=False,
                clarifying_question=None,
                steps=[
                    {
                        "id": "s1",
                        "tool": "tim_nhan_vien",
                        "args": {"tu_khoa": emp_code},
                        "save_as": "employee_info",
                    },
                    {
                        "id": "s2",
                        "tool": "danh_sach_don_nghi_phep",
                        "args": {
                            "employee_id": "{{employee_info.employee_id}}",
                            "status": "PENDING",
                            "limit": 1,
                        },
                        "save_as": "pending_leaves",
                    },
                    {
                        "id": "s3",
                        "tool": "chi_tiet_don_nghi_phep",
                        "args": {
                            "leave_request_id": "{{pending_leaves[0].leave_request_id}}"
                        },
                        "save_as": None,
                    },
                ],
                final_response_template=None,
            )


    # =========================
    # FALLBACK: GEMINI ROUTER
    # =========================
    sys = _build_system_instruction(module, auth)
    schema = _schema_for_module(module)

    resp = _client.models.generate_content(
        model=_GEMINI_MODEL,
        contents=f"USER_MESSAGE:\n{msg}",
        config={
            "system_instruction": sys,
            "temperature": 0.1,
            "response_mime_type": "application/json",
            "response_json_schema": schema,
        },
    )

    text = (resp.text or "").strip()
    if not text:
        return Plan(
            module=module,
            intent="router_error",
            needs_clarification=True,
            clarifying_question="Router không nhận được output từ Gemini.",
            steps=[],
            final_response_template=None,
        )

    try:
        data = json.loads(text)
        plan = Plan.model_validate(data)
    except Exception:
        try:
            plan = Plan.model_validate_json(text)
        except Exception:
            return Plan(
                module=module,
                intent="router_parse_error",
                needs_clarification=True,
                clarifying_question="Router không parse được PLAN JSON.",
                steps=[],
                final_response_template=None,
            )

    # Force module + force no template (đề phòng model lách)
    if plan.module != module:
        plan = plan.model_copy(update={"module": module})
    if plan.final_response_template is not None:
        plan = plan.model_copy(update={"final_response_template": None})
    if plan.needs_clarification:
        plan = plan.model_copy(update={"steps": []})


    return plan
