from __future__ import annotations
from typing import Dict, Optional
from app.ai.tooling import ToolSpec

_MODULE_TOOLS: Dict[str, Dict[str, ToolSpec]] = {
    "hrm": {},
    "sale_crm": {},
    "finance_accounting": {},
    "supply_chain": {},
}

def register_tools(module: str, tools: list[ToolSpec]):
    if module not in _MODULE_TOOLS:
        _MODULE_TOOLS[module] = {}
    for t in tools:
        _MODULE_TOOLS[module][t.ten_tool] = t

def get_tool(module: str, ten_tool: str) -> Optional[ToolSpec]:
    return _MODULE_TOOLS.get(module, {}).get(ten_tool)

def list_tools(module: str) -> list[ToolSpec]:
    return list(_MODULE_TOOLS.get(module, {}).values())

# auto register supply_chain tools
try:
    from app.modules.supply_chain.tools import SUPPLY_CHAIN_TOOLS
    register_tools("supply_chain", SUPPLY_CHAIN_TOOLS)
except Exception as e:
    # khi chưa tạo tools, hệ thống vẫn chạy được
    pass

# auto register hrm tools  ✅ THÊM
try:
    from app.modules.hrm.tools import HRM_TOOLS
    register_tools("hrm", HRM_TOOLS)
except Exception:
    pass
