# app/ai/llm_payload_filter.py
from typing import Any, List, Dict
from app.core.role.tool_policies import TOOL_POLICIES

def _strip_fields(obj: Any, deny_fields: set[str]) -> Any:
    if not deny_fields:
        return obj
    if isinstance(obj, dict):
        return {k: _strip_fields(v, deny_fields) for k, v in obj.items() if k not in deny_fields}
    if isinstance(obj, list):
        return [_strip_fields(x, deny_fields) for x in obj]
    return obj

def filter_step_infos_for_llm(module: str, step_infos: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for si in step_infos:
        tool = si.get("tool")
        policy = None

        mod_block = TOOL_POLICIES.get(module)
        if isinstance(mod_block, dict) and tool in mod_block:
            policy = mod_block.get(tool)
        else:
            policy = TOOL_POLICIES.get(tool)

        deny_fields = set(((policy or {}).get("field_policy") or {}).get("deny_fields") or [])

        si2 = dict(si)
        res = si2.get("result")
        if isinstance(res, dict) and "data" in res and deny_fields:
            res2 = dict(res)
            res2["data"] = _strip_fields(res.get("data"), deny_fields)
            si2["result"] = res2

        out.append(si2)
    return out