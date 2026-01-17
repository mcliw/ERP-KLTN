# app/ai/prompts/planner_registry.py
from __future__ import annotations

from typing import Callable

from app.ai.prompts.hrm_planner_prompt import build_hrm_planner_guide
from app.ai.prompts.supply_chain_planner_prompt import build_supply_chain_planner_guide
from app.ai.prompts.sale_crm_planner_prompt import build_sale_crm_planner_guide
from app.ai.prompts.finance_planner_prompt import build_finance_planner_guide


# mapping module -> function tạo guide (để có thể nhúng TODAY/THIS_MONTH/THIS_YEAR động)
MODULE_PLANNER_GUIDE_BUILDERS: dict[str, Callable[[], str]] = {
    "hrm": lambda: build_hrm_planner_guide(now_tz="Asia/Bangkok"),
    "supply_chain": lambda: build_supply_chain_planner_guide(now_tz="Asia/Bangkok"),
    "sale_crm": lambda: build_sale_crm_planner_guide(now_tz="Asia/Bangkok"),
    "finance_accounting": lambda: build_finance_planner_guide(now_tz="Asia/Bangkok"),
}


def get_planner_guide(module: str) -> str:
    fn = MODULE_PLANNER_GUIDE_BUILDERS.get(module)
    return (fn() if fn else "").strip()
