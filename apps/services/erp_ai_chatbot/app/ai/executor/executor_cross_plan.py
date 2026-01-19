from __future__ import annotations
from typing import Any, Dict, List
from uuid import UUID

from app.ai.plan_schema import Plan
from app.ai.placeholder import render_placeholders
from app.ai.module_registry import get_tool
from app.core.errors import PermissionDenied, InvalidPlan

DB_MODULES = {"hrm", "supply_chain", "sale_crm", "finance_accounting"}

def _deny_db_message(q: str) -> str:
    q = (q or "").strip()
    if q:
        return f"Bạn không đủ quyền để truy cập thông tin chi tiết về: {q}. Vui lòng liên hệ bộ phận chăm sóc khách hàng hoặc quản lý."
    return "Bạn không đủ quyền để truy cập thông tin chi tiết. Vui lòng liên hệ bộ phận chăm sóc khách hàng hoặc quản lý."

def run_cross_plan(
    plan: Plan,
    *,
    user_id: UUID | None,
    role: str | None,
    debug: bool = False,
) -> Dict[str, Any]:
    store: Dict[str, Any] = {}
    steps_out: List[Dict[str, Any]] = []
    answers: List[str] = []

    for step in plan.steps:
        step_id = step.id
        module = (step.module or "").strip()
        tool_name = (step.tool or "").strip()

        # render placeholder trong args trước khi gọi tool
        args = render_placeholders(step.args or {}, store)

        # RBAC: chỉ DB modules mới bắt role
        if module in DB_MODULES and not role:
            # chưa đăng nhập: ghi nhận nhưng không dừng
            answers.append(f"Bạn cần đăng nhập để xem thông tin chi tiết về: {tool_name}.")
            steps_out.append({"id": step_id, "module": module, "tool": tool_name, "args": args, "result": {"ok": False, "error": {"code": "AUTH_REQUIRED"}}})
            continue

        tool = get_tool(module, tool_name)
        if not tool:
            # tool không tồn tại
            answers.append(f"Không tìm thấy tool '{tool_name}' cho module '{module}'.")
            steps_out.append({"id": step_id, "module": module, "tool": tool_name, "args": args, "result": {"ok": False, "error": {"code": "TOOL_NOT_FOUND"}}})
            continue

        try:
            res = tool.handler(**args)
        except PermissionDenied:
            # không đủ quyền: không dừng
            # cố lấy "question" từ args nếu có để nói đúng ý user
            q = ""
            for k in ("message", "question", "query"):
                if isinstance(args, dict) and args.get(k):
                    q = str(args.get(k))
                    break
            answers.append(_deny_db_message(q or tool_name))
            res = {"ok": False, "error": {"code": "PERMISSION_DENIED"}}
        except InvalidPlan:
            answers.append(f"Không thể xử lý yêu cầu ở bước {step_id}.")
            res = {"ok": False, "error": {"code": "INVALID_PLAN"}}
        except Exception:
            answers.append(f"Hệ thống gặp lỗi khi xử lý bước {step_id}.")
            res = {"ok": False, "error": {"code": "INTERNAL_ERROR"}}

        store[step_id] = res
        if step.save_as:
            store[step.save_as] = res

        steps_out.append({"id": step_id, "module": module, "tool": tool_name, "args": args, "result": res})

    # answer cuối: nếu plan có final_response_template thì về sau dùng, hiện tại nối answers
    final = "\n\n".join([a for a in answers if a]).strip()
    return {"ok": True, "answer": final, "steps": steps_out, "plan": plan.model_dump(), "store": store}
