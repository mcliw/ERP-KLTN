# app/ai/auto_cross_planner.py
from __future__ import annotations
from typing import Any, Dict, List
from app.ai.plan_schema import Plan
from app.ai.module_detector import detect_tasks_llm
from app.ai.routers.common import gemini_fallback

def build_cross_plan_llm(message: str, auth: dict | None) -> Plan:
    msg = (message or "").strip()
    auth = auth or {}  # luôn là dict

    td = detect_tasks_llm(message=msg, role=auth.get("role"))
    if td.get("needs_clarification"):
        return Plan(
            module="auto",
            intent="multi_task",
            needs_clarification=True,
            clarifying_question=td.get("clarifying_question") or "Bạn muốn hỏi phần nào trước?",
            steps=[],
            final_response_template=None,
        )

    tasks = td.get("tasks") or []
    if not tasks:
        return Plan(
            module="auto",
            intent="multi_task",
            needs_clarification=True,
            clarifying_question="Bạn muốn hỏi gì?",
            steps=[],
            final_response_template=None,
        )

    subplans: List[Plan] = []
    for t in tasks:
        m = (t.get("module") or "").strip()
        q = (t.get("question") or "").strip()
        if not m or not q:
            continue
        if m == "general_chat":
            continue

        sp = gemini_fallback(module=m, message=q, auth=auth) 
        sp.intent = sp.intent or "auto"
        subplans.append(sp)

    # 2) Stitch steps lại, đổi id tuần tự s1..sn
    steps = []
    id_map: Dict[str, str] = {}
    counter = 1

    for sp in subplans:
        for st in sp.steps:
            new_id = f"s{counter}"
            counter += 1
            id_map[st.id] = new_id

            steps.append({
                "id": new_id,
                "module": st.module,   # đã có do schema_for_module khóa
                "tool": st.tool,
                "args": st.args,
                "save_as": st.save_as,
            })

    # 3) Heuristic linking (tự động) cho case DB->rag_policy “tính theo quy định”
    # Nếu trong steps có rag_policy step mà query có từ khóa thuế/BHXH/cách tính
    # và trước đó có DB step, thì append context placeholder {{sX.data}}.
    db_step_ids = [s["id"] for s in steps if s["module"] in ("hrm","finance_accounting","sale_crm","supply_chain")]
    for s in steps:
        if s["module"] == "rag_policy":
            q = (s["args"].get("query") or s["args"].get("message") or "").lower()
            if any(k in q for k in ["thuế", "bhxh", "bảo hiểm", "cách tính", "tính như thế nào", "bao nhiêu"]):
                if db_step_ids:
                    last_db = db_step_ids[-1]
                    base_query = s["args"].get("query") or ""
                    s["args"]["query"] = f"{base_query}\n\nDỮ LIỆU THỰC TẾ TỪ HỆ THỐNG: {{{{{last_db}.data}}}}"
    return Plan(
        module="auto",
        intent="multi_task",
        needs_clarification=False,
        clarifying_question=None,
        steps=steps,
        final_response_template=None,
    )
