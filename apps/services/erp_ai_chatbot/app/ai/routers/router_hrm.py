# # app/ai/routers/router_hrm.py
# from __future__ import annotations

# import re
# from app.ai.routers.common import gemini_fallback
# from app.ai.plan_schema import Plan, PlanStep
# from app.core.role.scope_resolver import resolve_scope
# from app.ai.hrm_intent_utils import is_self_query, extract_employee_code

# SELF_ONLY_MSG = "Bạn chỉ được xem dữ liệu của chính mình, không được xem nhân viên khác."

# def route_hrm_plan(module: str, message: str, auth: dict) -> Plan:
#     role = auth.get("role")
#     user_id = auth.get("user_id")

#     msg = (message or "").strip()
#     emp_code = extract_employee_code(msg)
#     self_q = is_self_query(msg)

#     # 1) có employee_code => muốn xem người khác (ƯU TIÊN)
#     if emp_code:
#         scope = resolve_scope(role_name=role, module="hrm", tool_name="thong_tin_nhan_vien")

#         # scope SELF/DEPT mà đi xem người khác => trả thẳng msg SELF
#         if scope in ("SELF", "DEPT"):
#             return Plan(
#                 module="hrm",
#                 intent="forbidden_other_employee",
#                 needs_clarification=False,
#                 clarifying_question=None,
#                 steps=[],
#                 final_response_template=SELF_ONLY_MSG,
#             )

#         # scope ALL => gọi tool xem theo mã
#         return Plan(
#             module="hrm",
#             intent="xem_thong_tin_nhan_vien_khac",
#             needs_clarification=False,
#             clarifying_question=None,
#             steps=[
#                 PlanStep(id="s1", module = module, tool="thong_tin_nhan_vien", args={"employee_code": emp_code}, save_as="emp")
#             ],
#             final_response_template=None,
#         )

#     # 2) self query (KHÔNG có mã)
#     if self_q:
#         return Plan(
#             module="hrm",
#             intent="xem_thong_tin_nhan_vien",
#             needs_clarification=False,
#             clarifying_question=None,
#             steps=[
#                 PlanStep(
#                     id="s1",
#                     module = module,
#                     tool="thong_tin_nhan_vien_theo_user",
#                     args={"user_id": user_id},   # hoặc {} để executor inject
#                     save_as="me",
#                 )
#             ],
#             final_response_template=None,
#         )

#     # 3) fallback: tìm theo keyword
#     scope = resolve_scope(role_name=role, module="hrm", tool_name="tim_nhan_vien")
#     if scope in ("SELF", "DEPT"):
#         return Plan(
#             module="hrm",
#             intent="forbidden_search_other_employee",
#             needs_clarification=False,
#             clarifying_question=None,
#             steps=[],
#             final_response_template=SELF_ONLY_MSG,
#         )

#     return Plan(
#         module="hrm",
#         intent="tim_nhan_vien",
#         needs_clarification=False,
#         clarifying_question=None,
#         steps=[PlanStep(id="s1", module = module, tool="tim_nhan_vien", args={"tu_khoa": msg}, save_as="candidates")],
#         final_response_template=None,
#     )

# def plan_route_hrm(module: str, message: str, auth: dict) -> Plan:
#     msg = (message or "").strip()

#     emp_code = extract_employee_code(msg)
#     self_q = is_self_query(msg)

#     # ✅ chỉ route rule-based khi:
#     # - có mã nhân viên (FIN003/CORE006...) hoặc
#     # - hỏi self nhưng KHÔNG có mã nhân viên
#     if emp_code or (self_q and not emp_code):
#         return route_hrm_plan(module, msg, auth)

#     low = msg.lower()

#     m_emp = re.search(r"\bNV\d+\b", msg, re.IGNORECASE)
#     m_my = re.search(r"(?:tháng|thang)\s*(\d{1,2})\s*/\s*(\d{4})", low)
#     wants_summary = any(k in low for k in ["tổng hợp chấm công", "tong hop cham cong"])

#     if m_emp and m_my and wants_summary:
#         emp_code = m_emp.group(0).upper()
#         month = int(m_my.group(1))
#         year = int(m_my.group(2))
#         return Plan(
#             module=module,
#             intent="tong_hop_cham_cong_thang",
#             needs_clarification=False,
#             clarifying_question=None,
#             steps=[
#                 {"id": "s1", "tool": "thong_tin_nhan_vien", "args": {"employee_code": emp_code}, "save_as": None},
#                 {"id": "s2", "tool": "tong_hop_cham_cong_thang", "args": {"employee_id": "{{s1.data.employee_id}}", "month": month, "year": year}, "save_as": None},
#             ],
#             final_response_template=None,
#         )

#     emp_m = re.search(r"\bNV\d+\b", msg, re.IGNORECASE)
#     asks_leave = any(k in low for k in ["nghỉ phép", "nghi phep", "leave"])
#     asks_pending = any(k in low for k in ["chờ duyệt", "cho duyet", "pending"])
#     asks_detail = any(k in low for k in ["chi tiết", "chi tiet", "detail"])
#     asks_latest = any(k in low for k in ["gần nhất", "gan nhat", "mới nhất", "moi nhat", "latest"])

#     if emp_m and asks_leave and asks_pending and asks_detail and asks_latest:
#         emp_code = emp_m.group(0).upper()
#         return Plan(
#             module=module,
#             intent="xem_don_nghi_phep_cho_duyet_gan_nhat",
#             needs_clarification=False,
#             clarifying_question=None,
#             steps=[
#                 {"id": "s1", "tool": "tim_nhan_vien", "args": {"tu_khoa": emp_code}, "save_as": "employee_info"},
#                 {"id": "s2", "tool": "danh_sach_don_nghi_phep", "args": {"employee_id": "{{employee_info.employee_id}}", "status": "PENDING", "limit": 1}, "save_as": "pending_leaves"},
#                 {"id": "s3", "tool": "chi_tiet_don_nghi_phep", "args": {"leave_request_id": "{{pending_leaves[0].leave_request_id}}"}, "save_as": None},
#             ],
#             final_response_template=None,
#         )

#     return gemini_fallback(module, msg, auth, extra_hints=[
#         "Tra cứu nhân sự: tim_nhan_vien / thong_tin_nhan_vien.",
#         "Chấm công: tong_hop_cham_cong_thang(employee_id, month, year).",
#         "Nghỉ phép: danh_sach_don_nghi_phep(employee_id, status, limit) + chi_tiet_don_nghi_phep(leave_request_id).",
#         "Lưu ý: tool hồ sơ nhân viên trả field 'employee_id' (không dùng 'id').",
#     ])

# app/ai/routers/router_hrm.py
from __future__ import annotations

from app.ai.routers.common import gemini_fallback
from app.ai.plan_schema import Plan
from app.ai.hrm_intent_utils import is_self_query, extract_employee_code


def plan_route_hrm(module: str, message: str, auth: dict) -> Plan:
    """
    ƯU TIÊN PLANNER LLM.
    Router HRM không hardcode intent nữa; chỉ đưa gợi ý tool+args để LLM lập plan đúng schema.
    Executor sẽ chịu trách nhiệm RBAC + inject auth (ví dụ user_id).
    """
    msg = (message or "").strip()

    # Nếu user gửi rỗng -> hỏi lại
    if not msg:
        # dùng gemini_fallback cũng được; nhưng return Plan clarify gọn hơn
        return Plan(
            module="hrm",
            intent="empty_message",
            needs_clarification=True,
            clarifying_question="Bạn muốn tra cứu HRM nội dung gì? (chấm công / nghỉ phép / lương / hợp đồng / hồ sơ nhân viên...)",
            steps=[],
            final_response_template=None,
        )

    emp_code = extract_employee_code(msg)
    self_q = is_self_query(msg)

    # Gợi ý đúng theo prompt + tools (không đổi schema Plan)
    extra_hints = [
        # Nhận diện định danh
        "NHẬN DIỆN NHÂN VIÊN: nếu có employee_code (chuỗi chữ+số như FIN001/EMP0001/...) => dùng thong_tin_nhan_vien(employee_code).",
        "Nếu hỏi SELF (có 'tôi/của tôi/mình' và không có employee_code) => dùng thong_tin_nhan_vien_theo_user với args = {} (executor sẽ inject user_id).",
        "Nếu chỉ có tên/từ khóa mơ hồ => dùng tim_nhan_vien(tu_khoa).",

        # Danh mục
        "Danh mục: danh_sach_phong_ban(limit), danh_sach_chuc_vu(limit), danh_sach_ca_lam(limit).",

        # Chấm công
        "Chấm công: cham_cong_hom_nay(employee_id) | cham_cong_ngay(employee_id, ngay:YYYY-MM-DD) | lich_su_cham_cong(employee_id, tu_ngay?, den_ngay?, limit?) | tong_hop_cham_cong_thang(employee_id, month, year) | ngay_thieu_checkout(employee_id, month, year).",

        # Nghỉ phép
        "Nghỉ phép: danh_sach_don_nghi_phep(employee_id, status?, leave_type?, tu_ngay?, den_ngay?, limit?) + chi_tiet_don_nghi_phep(leave_request_id) | tong_hop_nghi_phep_nam(employee_id, year, leave_type?) | don_nghi_phep_cho_duyet(approver_id={{me.employee_id}}, limit?).",

        # Tăng ca / OT (giữ đúng tool name nếu bạn đang có)
        "Tăng ca (OT): tong_hop_tang_ca_thang(employee_id, month, year) | danh_sach_don_tang_ca(employee_id, status?, month?, year?, limit?) | chi_tiet_don_tang_ca(ot_request_id) | don_tang_ca_cho_duyet(approver_id={{me.employee_id}}, limit?) | ot_theo_ngay(...).",

        # Lương
        "Lương: bang_luong_thang(employee_id, month, year) | chi_tiet_bang_luong(payslip_id) | lich_su_bang_luong(employee_id, limit?) | danh_sach_ky_luong(year?, status?, limit?) | ky_luong(month, year).",

        # Payment request HRM (nếu tool còn tồn tại)
        "Payment request HRM: danh_sach_yeu_cau_thanh_toan_hrm(status?, limit?) | yeu_cau_thanh_toan_theo_ky(payroll_period_id).",

        # Hợp đồng
        "Hợp đồng: hop_dong_hien_tai(employee_id) | lich_su_hop_dong(employee_id, limit?) | hop_dong_sap_het_han(days?, department_code?, limit?).",

        # Face data
        "Face data: trang_thai_face_data(employee_id).",
        "PLACEHOLDER: dùng {{me.employee_id}} hoặc {{emp.employee_id}} để chain bước sau.",
        "RÀNG BUỘC: thiếu required args => needs_clarification=true và steps=[]. Không bịa ID.",
    ]

    # Thêm hint ngắn theo ngữ cảnh để planner bắt nhanh hơn (không hardcode plan)
    if emp_code:
        extra_hints.insert(0, f"Phát hiện employee_code='{emp_code}' trong câu hỏi.")
    if self_q and not emp_code:
        extra_hints.insert(0, "Phát hiện câu hỏi SELF (tôi/của tôi/mình) và không có employee_code.")

    return gemini_fallback(module, msg, auth, extra_hints=extra_hints)
