from __future__ import annotations
from app.ai.plan_schema import Plan, PlanStep

def plan_route_rag_policy(module: str, message: str, auth: dict) -> Plan:
    msg = (message or "").strip()
    if not msg:
        return Plan(
            module="rag_policy",
            intent="tra_cuu_chinh_sach",
            needs_clarification=True,
            clarifying_question="Bạn muốn tra cứu chính sách gì?",
            steps=[],
            final_response_template=None,
        )

    return Plan(
        module="rag_policy",
        intent="tra_cuu_chinh_sach",
        needs_clarification=False,
        clarifying_question=None,
        steps=[
            PlanStep(
                id="s1",
                module = module,
                tool="tra_cuu_chinh_sach",
                args={"query": msg, "top_k": 5},
                save_as="rag_hits",
            )
        ],
        final_response_template=None,
    )
