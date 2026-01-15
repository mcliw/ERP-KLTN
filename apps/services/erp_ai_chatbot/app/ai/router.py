from __future__ import annotations

from app.ai.plan_schema import Plan

VALID_MODULES = {"supply_chain", "sale_crm", "hrm", "finance_accounting"}

def _detect_other_module(message: str) -> str | None:
    m = (message or "").lower()
    if any(k in m for k in ["đơn hàng", "khách hàng", "crm", "cskh", "voucher", "giỏ hàng", "đặt hàng"]):
        return "sale_crm"
    if any(k in m for k in ["nhân viên", "lương", "chấm công", "nghỉ phép", "phòng ban", "tuyển dụng"]):
        return "hrm"
    if any(k in m for k in ["po", "pr", "gr", "gi", "tồn kho", "ton kho", "nhà cung cấp", "nha cung cap", "procurement"]):
        return "supply_chain"
    if any(k in m for k in ["hóa đơn", "công nợ", "kế toán", "thu chi", "bút toán", "vat", "đối soát"]):
        return "finance_accounting"
    return None

def plan_route(module: str, message: str, auth: dict) -> Plan:
    msg = (message or "").strip()

    if module not in VALID_MODULES:
        return Plan(
            module=module,
            intent="module_khong_hop_le",
            needs_clarification=True,
            clarifying_question="Module không hợp lệ. Module hợp lệ: supply_chain, sale_crm, hrm, finance_accounting.",
            steps=[],
            final_response_template=None,
        )

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

    if module == "hrm":
        from app.ai.routers.router_hrm import plan_route_hrm
        return plan_route_hrm(module, msg, auth)

    if module == "supply_chain":
        from app.ai.routers.router_supply_chain import plan_route_supply_chain
        return plan_route_supply_chain(module, msg, auth)

    if module == "sale_crm":
        from app.ai.routers.router_sale_crm import plan_route_sale_crm
        return plan_route_sale_crm(module, msg, auth)

    # finance_accounting: tạm thời cho Gemini fallback qua common
    from app.ai.routers.common import gemini_fallback
    return gemini_fallback(module, msg, auth)