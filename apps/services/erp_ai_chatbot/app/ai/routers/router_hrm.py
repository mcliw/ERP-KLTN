from __future__ import annotations

import re
from app.ai.plan_schema import Plan
from app.ai.routers.common import gemini_fallback,build_system_instruction

def plan_route_hrm(module: str, message: str, auth: dict) -> Plan:
    msg = (message or "").strip()
    low = msg.lower()

    m_emp = re.search(r"\bNV\d+\b", msg, re.IGNORECASE)
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
                {"id": "s1", "tool": "thong_tin_nhan_vien", "args": {"employee_code": emp_code}, "save_as": None},
                {"id": "s2", "tool": "tong_hop_cham_cong_thang", "args": {"employee_id": "{{s1.data.employee_id}}", "month": month, "year": year}, "save_as": None},
            ],
            final_response_template=None,
        )

    emp_m = re.search(r"\bNV\d+\b", msg, re.IGNORECASE)
    asks_leave = any(k in low for k in ["nghỉ phép", "nghi phep", "leave"])
    asks_pending = any(k in low for k in ["chờ duyệt", "cho duyet", "pending"])
    asks_detail = any(k in low for k in ["chi tiết", "chi tiet", "detail"])
    asks_latest = any(k in low for k in ["gần nhất", "gan nhat", "mới nhất", "moi nhat", "latest"])

    if emp_m and asks_leave and asks_pending and asks_detail and asks_latest:
        emp_code = emp_m.group(0).upper()
        return Plan(
            module=module,
            intent="xem_don_nghi_phep_cho_duyet_gan_nhat",
            needs_clarification=False,
            clarifying_question=None,
            steps=[
                {"id": "s1", "tool": "tim_nhan_vien", "args": {"tu_khoa": emp_code}, "save_as": "employee_info"},
                {"id": "s2", "tool": "danh_sach_don_nghi_phep", "args": {"employee_id": "{{employee_info.employee_id}}", "status": "PENDING", "limit": 1}, "save_as": "pending_leaves"},
                {"id": "s3", "tool": "chi_tiet_don_nghi_phep", "args": {"leave_request_id": "{{pending_leaves[0].leave_request_id}}"}, "save_as": None},
            ],
            final_response_template=None,
        )

    return gemini_fallback(module, msg, auth, extra_hints=[
        "Tra cứu nhân sự: tim_nhan_vien / thong_tin_nhan_vien.",
        "Chấm công: tong_hop_cham_cong_thang(employee_id, month, year).",
        "Nghỉ phép: danh_sach_don_nghi_phep(employee_id, status, limit) + chi_tiet_don_nghi_phep(leave_request_id).",
        "Lưu ý: tool hồ sơ nhân viên trả field 'employee_id' (không dùng 'id').",
    ])
