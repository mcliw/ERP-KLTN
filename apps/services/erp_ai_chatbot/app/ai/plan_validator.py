from __future__ import annotations
from typing import Dict
from app.ai.plan_schema import Plan
from app.core.errors import InvalidPlan
from app.ai.module_registry import get_tool

def validate_plan(plan: Plan):
    if not plan.module:
        raise InvalidPlan("Thiếu module trong plan.")
    if plan.needs_clarification:
        return

    if not plan.steps:
        raise InvalidPlan("Plan không có bước thực thi (steps rỗng).")

    # validate tool exists and belongs to module
    for step in plan.steps:
        tool = get_tool(plan.module, step.tool)
        if tool is None:
            raise InvalidPlan(f"Tool '{step.tool}' không tồn tại trong module '{plan.module}'.")
