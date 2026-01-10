from __future__ import annotations
from dataclasses import dataclass
from typing import Callable, Type, Any, Dict, Optional
from pydantic import BaseModel

@dataclass(frozen=True)
class ToolSpec:
    ten_tool: str                      # tên tool (tiếng Việt, dùng trong plan)
    mo_ta: str
    args_model: Type[BaseModel]
    handler: Callable[..., Dict[str, Any]]
    module: str                        # hrm | sale_crm | finance_accounting | supply_chain
    read_only: bool = True

def ok(data: Any = None, thong_diep: str | None = None) -> Dict[str, Any]:
    return {"ok": True, "data": data, "thong_diep": thong_diep}

def can_lam_ro(cau_hoi: str, goi_y: Any = None) -> Dict[str, Any]:
    return {"ok": False, "needs_clarification": True, "question": cau_hoi, "candidates": goi_y}
