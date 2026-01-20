# app/ai/auto_cross_planner.py
from __future__ import annotations

from typing import Any, Dict, List

from app.ai.plan_schema import Plan
from app.ai.module_detector import detect_tasks_llm
from app.ai.routers.common import gemini_fallback


def build_cross_plan_llm(message: str, auth: dict | None) -> Plan:
    msg = (message or "").strip()
    auth = auth or {}

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
    clarifications: List[str] = []

    for t in tasks:
        m = (t.get("module") or "").strip()
        q = (t.get("question") or "").strip()
        if not m or not q or m == "general_chat":
            continue

        # ✅ extra_hints siết mạnh cho rag_policy (hay bị output bậy)
        extra_hints = None
        if m == "rag_policy":
            extra_hints = [
                "Chỉ dùng tool: tra_cuu_chinh_sach",
                "Chỉ được dùng args đúng 1 field: query (string)",
                "id phải theo pattern s<number>, ví dụ s1",
                "Nếu thiếu query => needs_clarification=true và steps=[]",
            ]

        sp = gemini_fallback(module=m, message=q, auth=auth, extra_hints=extra_hints)

        # ✅ nếu router_parse_error hoặc needs_clarification thì gom lại hỏi 1 lần
        if sp.needs_clarification:
            cq = sp.clarifying_question or f"Thiếu thông tin để xử lý yêu cầu ở module {m}."
            clarifications.append(f"- ({m}) {cq}")
            continue

        # ✅ bỏ luôn subplan rỗng steps
        if not sp.steps:
            clarifications.append(f"- ({m}) Không tạo được bước thực thi hợp lệ.")
            continue

        sp.intent = sp.intent or "auto"
        subplans.append(sp)

    if clarifications and not subplans:
        return Plan(
            module="auto",
            intent="multi_task",
            needs_clarification=True,
            clarifying_question="Mình cần bạn bổ sung:\n" + "\n".join(clarifications),
            steps=[],
            final_response_template=None,
        )

    # ✅ Stitch steps lại, đổi id tuần tự s1..sn
    steps: List[Dict[str, Any]] = []
    counter = 1

    for sp in subplans:
        for st in sp.steps:
            new_id = f"s{counter}"
            counter += 1

            # ✅ save_as nếu trống thì auto đặt để dễ compose/debug
            save_as = st.save_as or f"{st.module}_{new_id}"

            steps.append(
                {
                    "id": new_id,
                    "module": st.module,  # đã khóa bởi schema_for_module
                    "tool": st.tool,
                    "args": st.args,
                    "save_as": save_as,
                }
            )

    # ✅ Heuristic linking DB->rag_policy (chỉ khi query thuộc nhóm “tính theo quy định”)
    db_step_ids = [s["id"] for s in steps if s["module"] in ("hrm", "finance_accounting", "sale_crm", "supply_chain")]
    for s in steps:
        if s["module"] == "rag_policy":
            q_lower = ((s["args"].get("query") or "")).lower()
            if any(k in q_lower for k in ["thuế", "bhxh", "bảo hiểm", "cách tính", "tính như thế nào", "bao nhiêu"]):
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
