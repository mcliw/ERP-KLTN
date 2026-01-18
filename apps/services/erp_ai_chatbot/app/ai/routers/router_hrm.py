# app/ai/routers/router_hrm.py
from __future__ import annotations

import re
from app.ai.routers.common import gemini_fallback
from app.ai.plan_schema import Plan, PlanStep
from app.core.role.scope_resolver import resolve_scope
from app.ai.hrm_intent_utils import is_self_query, extract_employee_code

SELF_ONLY_MSG = "Bạn chỉ được xem dữ liệu của chính mình, không được xem nhân viên khác."

def route_hrm_plan(module: str, message: str, auth: dict) -> Plan:
    role = auth.get("role")
    user_id = auth.get("user_id")

    msg = (message or "").strip()
    emp_code = extract_employee_code(msg)
    self_q = is_self_query(msg)

    # 1) có employee_code => muốn xem người khác (ƯU TIÊN)
    if emp_code:
        scope = resolve_scope(role_name=role, module="hrm", tool_name="thong_tin_nhan_vien")

        # scope SELF/DEPT mà đi xem người khác => trả thẳng msg SELF
        if scope in ("SELF", "DEPT"):
            return Plan(
                module="hrm",
                intent="forbidden_other_employee",
                needs_clarification=False,
                clarifying_question=None,
                steps=[],
                final_response_template=SELF_ONLY_MSG,
            )

        # scope ALL => gọi tool xem theo mã
        return Plan(
            module="hrm",
            intent="xem_thong_tin_nhan_vien_khac",
            needs_clarification=False,
            clarifying_question=None,
            steps=[
                PlanStep(id="s1", tool="thong_tin_nhan_vien", args={"employee_code": emp_code}, save_as="emp")
            ],
            final_response_template=None,
        )

    # 2) self query (KHÔNG có mã)
    if self_q:
        return Plan(
            module="hrm",
            intent="xem_thong_tin_nhan_vien",
            needs_clarification=False,
            clarifying_question=None,
            steps=[
                PlanStep(
                    id="s1",
                    tool="thong_tin_nhan_vien_theo_user",
                    args={"user_id": user_id},   # hoặc {} để executor inject
                    save_as="me",
                )
            ],
            final_response_template=None,
        )

    # 3) fallback: tìm theo keyword
    scope = resolve_scope(role_name=role, module="hrm", tool_name="tim_nhan_vien")
    if scope in ("SELF", "DEPT"):
        return Plan(
            module="hrm",
            intent="forbidden_search_other_employee",
            needs_clarification=False,
            clarifying_question=None,
            steps=[],
            final_response_template=SELF_ONLY_MSG,
        )

    return Plan(
        module="hrm",
        intent="tim_nhan_vien",
        needs_clarification=False,
        clarifying_question=None,
        steps=[PlanStep(id="s1", tool="tim_nhan_vien", args={"tu_khoa": msg}, save_as="candidates")],
        final_response_template=None,
    )

def plan_route_hrm(module: str, message: str, auth: dict) -> Plan:
    msg = (message or "").strip()

    emp_code = extract_employee_code(msg)
    self_q = is_self_query(msg)

    # ✅ chỉ route rule-based khi:
    # - có mã nhân viên (FIN003/CORE006...) hoặc
    # - hỏi self nhưng KHÔNG có mã nhân viên
    if emp_code or (self_q and not emp_code):
        return route_hrm_plan(module, msg, auth)

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
