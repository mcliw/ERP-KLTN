# app/ai/router.py
from __future__ import annotations

from app.ai.plan_schema import Plan

VALID_MODULES = {"supply_chain", "sale_crm", "hrm", "finance_accounting", "rag_policy"}

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

    if module == "hrm":
        from app.ai.routers.router_hrm import plan_route_hrm
        return plan_route_hrm(module, msg, auth)

    if module == "supply_chain":
        from app.ai.routers.router_supply_chain import plan_route_supply_chain
        return plan_route_supply_chain(module, msg, auth)

    if module == "sale_crm":
        from app.ai.routers.router_sale_crm import plan_route_sale_crm
        return plan_route_sale_crm(module, msg, auth)

    if module == "finance_accounting":
        from app.ai.routers.router_finance_accounting import plan_route_finance_accounting
        return plan_route_finance_accounting(module, msg, auth)
    
    if module == "rag_policy":
        from app.ai.routers.router_rag_policy import plan_route_rag_policy
        return plan_route_rag_policy(module, msg, auth)

    # không tới đây
    from app.ai.routers.common import gemini_fallback
    return gemini_fallback(module, msg, auth)
