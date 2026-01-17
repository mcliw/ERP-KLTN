from __future__ import annotations

from .executor_hrm import execute_chat_hrm
from .executor_supply_chain import execute_chat_supply_chain

def execute_chat(module: str, *args, **kwargs):
    if module == "hrm":
        return execute_chat_hrm(module, *args, **kwargs)
    if module == "supply_chain":
        return execute_chat_supply_chain(module, *args, **kwargs)
    raise ValueError(f"Unsupported module: {module}")
