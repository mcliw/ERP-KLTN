from __future__ import annotations
from typing import Dict, Optional
from app.ai.tooling import ToolSpec

_MODULE_TOOLS: Dict[str, Dict[str, ToolSpec]] = {
    "hrm": {},
    "sale_crm": {},
    "finance_accounting": {},
    "supply_chain": {},
}

_LOADED: set[str] = set()

def register_tools(module: str, tools: list[ToolSpec]):
    if module not in _MODULE_TOOLS:
        _MODULE_TOOLS[module] = {}
    for t in tools:
        _MODULE_TOOLS[module][t.ten_tool] = t

def ensure_loaded(module: str):
    if module in _LOADED:
        return

    if module == "hrm":
        from app.modules.hrm.tools import HRM_TOOLS
        register_tools("hrm", HRM_TOOLS)

    elif module == "supply_chain":
        from app.modules.supply_chain.tools import SUPPLY_CHAIN_TOOLS
        register_tools("supply_chain", SUPPLY_CHAIN_TOOLS)

    elif module == "sale_crm":
        from app.modules.sale_crm.tools import SALE_CRM_TOOLS
        register_tools("sale_crm", SALE_CRM_TOOLS)

    # elif module == "finance_accounting":
    #     from app.modules.finance_accounting.tools import FINANCE_ACCOUNTING_TOOLS
    #     register_tools("finance_accounting", FINANCE_ACCOUNTING_TOOLS)

    _LOADED.add(module)

def get_tool(module: str, ten_tool: str) -> Optional[ToolSpec]:
    ensure_loaded(module)
    return _MODULE_TOOLS.get(module, {}).get(ten_tool)

def list_tools(module: str) -> list[ToolSpec]:
    ensure_loaded(module)
    return list(_MODULE_TOOLS.get(module, {}).values())
