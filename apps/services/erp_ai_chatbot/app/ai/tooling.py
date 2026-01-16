from __future__ import annotations
from dataclasses import dataclass
from typing import Callable, Type, Any, Dict, Optional
from pydantic import BaseModel

@dataclass(frozen=True)
class ToolSpec:
    ten_tool: str                     
    mo_ta: str
    args_model: Type[BaseModel]
    handler: Callable[..., Dict[str, Any]]
    module: str                       
    read_only: bool = True

def ok(data=None, thong_diep: str = "", answer: str | None = None, **extra):
    out = {"ok": True, "data": data, "thong_diep": thong_diep}
    if answer:
        out["answer"] = answer
    if extra:
        out.update(extra)
    return out

def can_lam_ro(cau_hoi: str, goi_y: Any = None) -> Dict[str, Any]:
    return {"ok": False, "needs_clarification": True, "question": cau_hoi, "candidates": goi_y}
