from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def write(rel_path: str, content: str):
    p = ROOT / rel_path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    print(f"[WRITE] {rel_path}")

def main():
    # Ghi đè executor.py (phiên bản có preview facts cho paraphrase)
    write("app/ai/executor.py", r'''
from __future__ import annotations
import re
from typing import Any, Dict, Optional, List

from app.core.rbac import check_role
from app.core.audit_log import audit
from app.core.errors import PermissionDenied, ToolExecutionError
from app.ai.router import plan_route
from app.ai.plan_validator import validate_plan
from app.ai.module_registry import get_tool
from app.ai.tooling import ToolSpec

from app.db.supply_chain_database import SupplyChainSessionLocal
from app.ai.paraphraser import paraphrase_answer

VAR_DBL_RE = re.compile(r"\{\{\s*([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+|\[[0-9]+\])*)\s*\}\}")
VAR_SGL_RE = re.compile(r"\{\s*(s[0-9]+(?:\.[a-zA-Z0-9_]+|\[[0-9]+\])*)\s*\}")

def _get_path(store: dict, path: str):
    cur: Any = store
    for part in path.split("."):
        m = re.match(r"^([a-zA-Z0-9_]+)(\[[0-9]+\])?$", part)
        if not m:
            raise KeyError(path)
        key = m.group(1)
        cur = cur[key]
        if m.group(2):
            idx = int(m.group(2)[1:-1])
            cur = cur[idx]
    return cur

def _render_template(tpl: str, store: dict) -> str:
    def repl(match):
        path = match.group(1)
        try:
            val = _get_path(store, path)
            return "" if val is None else str(val)
        except Exception:
            return match.group(0)

    out = VAR_DBL_RE.sub(repl, tpl)
    out = VAR_SGL_RE.sub(repl, out)
    return out

def _resolve_args(args: Dict[str, Any], store: dict) -> Dict[str, Any]:
    out = {}
    for k, v in args.items():
        out[k] = _render_template(v, store) if isinstance(v, str) else v
    return out

def _execute_tool(module: str, tool: ToolSpec, args: Dict[str, Any]) -> Dict[str, Any]:
    if module == "supply_chain":
        session = SupplyChainSessionLocal()
        try:
            parsed = tool.args_model.model_validate(args)
            return tool.handler(session=session, **parsed.model_dump())
        except Exception as e:
            raise ToolExecutionError(str(e))
        finally:
            session.close()
    raise ToolExecutionError(f"Chưa hỗ trợ executor cho module '{module}'.")

def _s(v, default="N/A"):
    if v is None: return default
    if isinstance(v, str) and not v.strip(): return default
    return v

def _fmt_list(lines: List[str], limit: int = 7) -> str:
    if not lines: return ""
    shown = lines[:limit]
    more = len(lines) - len(shown)
    return "\n".join(shown) + (f"\n(+{more} dòng)" if more > 0 else "")

# =========================
# Deterministic formatter
# =========================
def _fallback_from_data(data: Any) -> Optional[str]:
    # RAG
    if isinstance(data, dict) and "answer" in data and "sources" in data and isinstance(data["sources"], list):
        src_lines = []
        for s in data["sources"][:4]:
            if isinstance(s, dict):
                src_lines.append(f"- {s.get('source')}: {s.get('snippet')}")
        return f"{data.get('answer')}\n\nNguồn tham khảo:\n{_fmt_list(src_lines, 4)}"

    # Tồn kho
    if isinstance(data, dict) and {"sku","product_name","total_available","total_allocated","total_on_hand"}.issubset(data.keys()):
        lines = []
        details = data.get("details") or []
        for d in details[:5]:
            lines.append(
                f"- {d.get('warehouse_code')} ({d.get('warehouse_name')}), bin {_s(d.get('bin_code'))}: "
                f"khả dụng {d.get('available')} (tồn {d.get('on_hand')}, giữ {d.get('allocated')})"
            )
        extra = ("\nChi tiết:\n" + "\n".join(lines)) if lines else ""
        return (
            f"Tồn kho SKU {data['sku']} ({data['product_name']}): "
            f"khả dụng {data['total_available']}, đang giữ {data['total_allocated']}, tồn {data['total_on_hand']}."
            f"{extra}"
        )

    # PO/PR/GR/GI status
    if isinstance(data, dict) and "po_code" in data and "status" in data:
        return (
            f"Đơn mua {data['po_code']} trạng thái: {data['status']}. "
            f"NCC: {_s(data.get('supplier_name') or data.get('supplier_code'))}. "
            f"Ngày đặt: {_s(data.get('order_date'))}. Dự kiến giao: {_s(data.get('expected_delivery_date'))}."
        )
    if isinstance(data, dict) and "pr_code" in data and "status" in data:
        return f"PR {data['pr_code']} trạng thái: {data['status']}. Ngày yêu cầu: {_s(data.get('request_date'))}."
    if isinstance(data, dict) and "gr_code" in data and "status" in data:
        return f"GR {data['gr_code']} trạng thái: {data['status']}. Ngày nhập: {_s(data.get('receipt_date'))}."
    if isinstance(data, dict) and "gi_code" in data and "status" in data:
        return f"GI {data['gi_code']} trạng thái: {data['status']}. Ngày xuất: {_s(data.get('issue_date'))}."

    # List: PO / Log
    if isinstance(data, list) and data and all(isinstance(x, dict) for x in data):
        keys = set().union(*[set(x.keys()) for x in data[:5]])
        if "po_code" in keys and "status" in keys:
            lines = [f"- {x.get('po_code')}: {x.get('status')} | ETD {_s(x.get('expected_delivery_date'))}" for x in data[:10]]
            return "Danh sách PO:\n" + _fmt_list(lines, 10)
        if "transaction_type" in keys and "quantity_change" in keys and "reference_code" in keys:
            lines = [f"- {_s(x.get('transaction_date'))} | {x.get('transaction_type')} | {x.get('sku')} | Δ {x.get('quantity_change')} | ref {x.get('reference_code')}" for x in data[:12]]
            return "Log biến động tồn kho:\n" + _fmt_list(lines, 12)

    return None

def _is_bad_answer(answer: str) -> bool:
    if not answer: return True
    if "..." in answer: return True
    if "{{" in answer or "}}" in answer: return True
    if "{s" in answer: return True
    return False

# =========================
# FACTS preview for paraphrase
# =========================
def _drop_none(d: Dict[str, Any]) -> Dict[str, Any]:
    return {k: v for k, v in d.items() if v is not None}

def _filter_row(row: Dict[str, Any]) -> Dict[str, Any]:
    # heuristic chọn field phổ biến theo “shape”
    keys = set(row.keys())

    if "po_code" in keys:
        keep = ["po_code", "status", "order_date", "expected_delivery_date", "supplier_name", "supplier_code", "total_amount"]
    elif "pr_code" in keys:
        keep = ["pr_code", "status", "request_date"]
    elif "gr_code" in keys:
        keep = ["gr_code", "status", "receipt_date", "warehouse_code", "po_code", "supplier_name"]
    elif "gi_code" in keys:
        keep = ["gi_code", "status", "issue_date", "issue_type", "reference_doc_id", "warehouse_code"]
    elif "transaction_type" in keys and "quantity_change" in keys:
        keep = ["transaction_date", "transaction_type", "sku", "warehouse_code", "quantity_change", "reference_code"]
    elif "sku" in keys and ("available" in keys or "on_hand" in keys):
        keep = ["warehouse_code", "warehouse_name", "bin_code", "on_hand", "allocated", "available", "sku"]
    else:
        keep = list(row.keys())[:8]

    out = {}
    for k in keep:
        if k in row:
            out[k] = row.get(k)
    return _drop_none(out)

def _preview_data(data: Any, list_n: int = 6, nested_n: int = 6) -> Dict[str, Any]:
    # list output
    if isinstance(data, list):
        preview = []
        for r in data[:max(1, min(list_n, 20))]:
            if isinstance(r, dict):
                preview.append(_filter_row(r))
            else:
                preview.append(r)
        return {
            "type": "list",
            "total": len(data),
            "items_preview": preview
        }

    # object output
    if isinstance(data, dict):
        out: Dict[str, Any] = {"type": "object"}

        # core fields (không nhét cả object)
        core_keep = []
        if "sku" in data: core_keep += ["sku", "product_name", "total_on_hand", "total_allocated", "total_available"]
        if "po_code" in data: core_keep += ["po_code", "status", "order_date", "expected_delivery_date", "supplier_name", "supplier_code", "total_amount"]
        if "pr_code" in data: core_keep += ["pr_code", "status", "request_date"]
        if "gr_code" in data: core_keep += ["gr_code", "status", "receipt_date", "warehouse_code", "po_code", "supplier_name"]
        if "gi_code" in data: core_keep += ["gi_code", "status", "issue_date", "issue_type", "reference_doc_id", "warehouse_code"]
        if not core_keep:
            # fallback: lấy tối đa 8 field scalar
            for k, v in data.items():
                if isinstance(v, (str, int, float, bool)) or v is None:
                    core_keep.append(k)
                if len(core_keep) >= 8:
                    break

        core = {}
        for k in core_keep:
            if k in data:
                core[k] = data.get(k)
        out["core"] = _drop_none(core)

        # nested arrays preview
        if isinstance(data.get("items"), list):
            items = data["items"]
            out["items_total"] = len(items)
            out["items_preview"] = [_filter_row(x) for x in items[:max(1, min(nested_n, 20))] if isinstance(x, dict)]

        if isinstance(data.get("details"), list):
            details = data["details"]
            out["details_total"] = len(details)
            out["details_preview"] = [_filter_row(x) for x in details[:max(1, min(nested_n, 20))] if isinstance(x, dict)]

        if isinstance(data.get("sources"), list):
            srcs = data["sources"]
            out["sources_total"] = len(srcs)
            out["sources_preview"] = [
                _drop_none({"source": s.get("source"), "score": s.get("score")})
                for s in srcs[:max(1, min(4, len(srcs)))]
                if isinstance(s, dict)
            ]

        return out

    # primitive
    return {"type": type(data).__name__, "value": data}

def _build_facts_for_paraphrase(store: Dict[str, Any], list_n: int = 6, nested_n: int = 6) -> Dict[str, Any]:
    s1 = store.get("s1")
    if not isinstance(s1, dict):
        return {"type": "no_s1", "store_keys": list(store.keys())[:20]}

    data = s1.get("data")
    return _drop_none({
        "step": "s1",
        "thong_diep": s1.get("thong_diep"),
        "preview": _preview_data(data, list_n=list_n, nested_n=nested_n)
    })

# =========================
# Main
# =========================
def execute_chat(module: str, user_id: int | None, role: str | None, message: str, paraphrase_enabled: bool = True):
    if not check_role(module, role):
        raise PermissionDenied(f"Role '{role}' không được phép dùng chatbot module '{module}'.")

    auth = {"user_id": user_id, "role": role, "is_authenticated": True}
    plan = plan_route(module=module, message=message, auth=auth)
    audit({"event": "plan_created", "module": module, "plan": plan.model_dump()})

    if plan.needs_clarification:
        return {"answer": plan.clarifying_question, "plan": plan.model_dump()}

    validate_plan(plan)

    store: Dict[str, Any] = {}
    for idx, step in enumerate(plan.steps, start=1):
        tool = get_tool(plan.module, step.tool)
        if tool is None:
            raise ToolExecutionError(f"Không tìm thấy tool '{step.tool}' trong module '{plan.module}'.")

        resolved_args = _resolve_args(step.args, store)
        audit({"event": "tool_call", "module": plan.module, "tool": step.tool, "args": resolved_args})

        result = _execute_tool(plan.module, tool, resolved_args)
        audit({"event": "tool_result", "module": plan.module, "tool": step.tool, "result": result})

        if isinstance(result, dict) and result.get("needs_clarification"):
            return {"answer": result.get("question"), "candidates": result.get("candidates"), "plan": plan.model_dump()}

        store[step.id] = result
        store[f"s{idx}"] = result  # alias chuẩn
        if step.save_as:
            store[step.save_as] = result

    answer = None
    if plan.final_response_template:
        answer = _render_template(plan.final_response_template, store)

    # Deterministic answer từ data thật
    if _is_bad_answer(answer or ""):
        s1 = store.get("s1")
        if isinstance(s1, dict):
            data = s1.get("data")
            fb = _fallback_from_data(data)
            if fb:
                answer = fb

    answer = answer or "Đã tra cứu xong."

    # ===== Layer B: LLM paraphrase + FACTS preview =====
    facts_for_paraphrase = _build_facts_for_paraphrase(store, list_n=6, nested_n=6)
    answer_final = paraphrase_answer(answer, facts=facts_for_paraphrase, enabled=paraphrase_enabled)

    return {"answer": answer_final, "data": store, "plan": plan.model_dump()}
'''.lstrip())

    print("DONE: Added FACTS preview for paraphrase. Restart uvicorn.")

if __name__ == "__main__":
    main()
