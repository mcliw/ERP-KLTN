from fastapi import APIRouter
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel

import json
from uuid import UUID

from app.ai.executor.executor_chat import execute_chat_unified
from app.ai.module_detector import detect_module_llm

from app.core.role.auth_context import build_auth_context
from app.core.errors import PermissionDenied

from app.db.chat_database import ChatSessionLocal
from app.db.chat_memory_repo import (
    get_or_create_conversation,
    fetch_recent_messages,
    fetch_last_context,
    append_message,
)

router = APIRouter()


class ChatRequest(BaseModel):
    user_id: UUID | None = None
    role: str | None = None
    module: str = "auto"
    message: str
    debug: bool = True
    compose: bool = True
    detect_only: bool = False
    conversation_id: UUID | None = None

# class ChatRequest(BaseModel):
#     module: str = "auto"
#     message: str
#     debug: bool = False
#     compose: bool = True
#     detect_only: bool = False


def _build_context_prefix(
    context_json: dict | None,
    recent_pairs: list[dict],
    auth_ctx,                      
    max_chars: int = 2500
) -> str:
    payload = {
        "self": {                
            "user_id": str(auth_ctx.user_id) if auth_ctx and auth_ctx.user_id else None,
            "role": auth_ctx.role if auth_ctx else None,
            "employee_id": auth_ctx.employee_id if auth_ctx else None,
            "employee_code": auth_ctx.employee_code if auth_ctx else None,
            "dept_id": auth_ctx.dept_id if auth_ctx else None,
            # permissions nhiều quá thì không cần nhét vào context prompt
        },
        "focus_text": (context_json or {}).get("focus_text"),
        "conversation_context": context_json or {},
        "recent_turns": recent_pairs[-8:],
        "rules": [
            "Nếu câu hiện tại là SELF (tôi/của tôi/mình) và self.employee_code != null thì KHÔNG hỏi lại mã nhân viên. Ưu tiên dùng tool thong_tin_nhan_vien_theo_user với args={} (executor sẽ tự inject user_id).",
            "Nếu câu hiện tại thiếu định danh, ưu tiên dùng focus_text/focus_payload để suy ra đối tượng.",
            "Không được bịa ID/số liệu. Thiếu dữ liệu thì needs_clarification=true.",
        ],
    }

    s = json.dumps(payload, ensure_ascii=False)
    if len(s) > max_chars:
        s = s[:max_chars] + "..."
    return f"[CONTEXT]\n{s}\n[/CONTEXT]\n\n"



def _extract_context_from_result(result: dict) -> dict:
    """
    Trích context để LLM hiểu 'người đó/số đó/tháng đó' cho turn sau.
    Không lưu PII nhạy cảm, không lưu raw.
    """
    data = (result or {}).get("data") or {}
    plan = (result or {}).get("plan") or {}
    steps = plan.get("steps") or []

    # 1) Chọn focus_ref: ưu tiên save_as cuối cùng
    focus_ref = None
    for st in reversed(steps):
        sa = st.get("save_as")
        if sa and sa in data:
            focus_ref = sa
            break
    if not focus_ref:
        keys = [k for k in data.keys() if not k.endswith("__raw")]
        focus_ref = keys[-1] if keys else None

    raw_focus = data.get(focus_ref) if focus_ref else None

    # 2) Normalize: nhiều tool trả {"ok":true,"data":{...}}; có tool trả thẳng dict
    if isinstance(raw_focus, dict) and "data" in raw_focus and isinstance(raw_focus.get("data"), (dict, list)):
        focus_payload = raw_focus.get("data")
    else:
        focus_payload = raw_focus

    # 3) Lọc PII + chỉ giữ các field có ích cho tham chiếu
    # - IDs/codes: employee_code, po_code, gr_code, invoice_code, ...
    # - thời gian: month, year, from_date, to_date, date
    # - số tổng hợp: total_hours, total_amount, amount, quantity, ...
    ALLOW_KEYS = {
        # generic ids/codes
        "id", "code", "no", "number",
        "employee_id", "employee_code",
        "customer_id", "customer_code",
        "po_id", "po_code", "gr_id", "gr_code",
        "so_phieu", "ma_phieu",
        "invoice_id", "invoice_code",
        "order_id", "order_code",
        # time
        "date", "month", "year", "from_date", "to_date", "period",
        # status/type
        "status", "state", "type",
        # summary numbers
        "total", "total_hours", "total_amount", "amount", "net_amount",
        "hours", "qty", "quantity", "count",
        # hrm common
        "department_id", "department_code", "department_name",
        "position_id", "position_title",
    }

    BLOCK_KEYS = {
        # PII / sensitive
        "email", "email_company", "phone", "address",
        "identity_card", "bank_account_number", "bank_name",
        "dob",
    }

    def _shallow_filter(obj):
        if isinstance(obj, dict):
            out = {}
            for k, v in obj.items():
                lk = (k or "").lower()
                if lk in BLOCK_KEYS:
                    continue
                # giữ nếu key nằm allow, hoặc là key dạng *_code, *_id, total_*
                if (k in ALLOW_KEYS) or lk.endswith("_id") or lk.endswith("_code") or lk.startswith("total_"):
                    # không giữ text quá dài
                    if isinstance(v, str) and len(v) > 200:
                        out[k] = v[:200] + "..."
                    else:
                        out[k] = v
            return out
        if isinstance(obj, list):
            # chỉ lấy 5 phần tử đầu để tránh phình
            return [_shallow_filter(x) for x in obj[:5]]
        return obj

    safe_focus = _shallow_filter(focus_payload)

    # 4) Tạo focus_text giúp LLM bám nhanh
    focus_text = None
    if isinstance(safe_focus, dict):
        if safe_focus.get("employee_code"):
            focus_text = f"Đối tượng gần nhất: employee_code={safe_focus.get('employee_code')}"
        elif safe_focus.get("po_code"):
            focus_text = f"Đối tượng gần nhất: po_code={safe_focus.get('po_code')}"
        elif safe_focus.get("invoice_code"):
            focus_text = f"Đối tượng gần nhất: invoice_code={safe_focus.get('invoice_code')}"
        elif safe_focus.get("month"):
            focus_text = f"Ngữ cảnh gần nhất: month={safe_focus.get('month')}"

    return {
        "focus_ref": focus_ref,
        "focus_payload": safe_focus, 
        "focus_text": focus_text,
        "store_keys": [k for k in data.keys() if not k.endswith("__raw")],
        "selected_module": (result or {}).get("selected_module"),
    }


@router.post("/chat")
def chat(req: ChatRequest):
    # 1) build auth từ identity (role/perms thật)
    auth_ctx = build_auth_context(user_id=req.user_id)

    # BẮT BUỘC đăng nhập
    if not auth_ctx.is_authenticated or not auth_ctx.role or not req.user_id:
        raise PermissionDenied("Vui lòng đăng nhập để sử dụng chat.")

    db = ChatSessionLocal()
    try:
        conversation_id = None

        # ===== 1) Tạo / lấy conversation (chỉ khi có user_id) =====
        if req.user_id:
            conv = get_or_create_conversation(db, user_id=req.user_id)
            conversation_id = conv.conversation_id

        # ===== 2) detect_only: chỉ chạy detector =====
        if req.detect_only:
            det_role = auth_ctx.role or req.role
            det = detect_module_llm(message=req.message, role=det_role)
            if req.debug:
                det = {"detector": det, "auth": auth_ctx.model_dump()}
            # detect_only cũng có thể lưu history nếu bạn muốn; hiện tại bỏ qua cho gọn
            return JSONResponse(content=jsonable_encoder(det), media_type="application/json; charset=utf-8")

        # ===== 3) Load memory (context + recent turns) để LLM hiểu "người đó/số đó" =====
        context_json = fetch_last_context(db, conversation_id) if conversation_id else None
        recent_msgs = fetch_recent_messages(db, conversation_id, window_minutes=5) if conversation_id else []

        recent_pairs = []
        for m in recent_msgs:  # ✅ old -> new
            if m.role == "user" and m.question:
                recent_pairs.append({"role": "user", "content": m.question})
            elif m.role == "assistant" and m.answer:
                recent_pairs.append({"role": "assistant", "content": m.answer})

        enriched_message = _build_context_prefix(context_json, recent_pairs, auth_ctx) + req.message

        # ===== 5) Đã đăng nhập: chạy unified executor bình thường, nhưng dùng enriched_message =====
        result = execute_chat_unified(
            module=req.module,
            user_id=req.user_id,
            role=auth_ctx.role,        
            message=enriched_message,  
            compose_enabled=req.compose,
            debug=req.debug,
        )

        # ===== 6) Save history =====
        if conversation_id:
            append_message(
                db,
                conversation_id=conversation_id,
                role="user",           
                question=req.message,
                module=req.module,
            )

            new_context = _extract_context_from_result(result if isinstance(result, dict) else {})
            append_message(
                db,
                conversation_id=conversation_id,
                role="assistant",         
                answer=(result or {}).get("answer") if isinstance(result, dict) else None,
                module=(result or {}).get("selected_module") if isinstance(result, dict) else None,
                plan_json=(result or {}).get("plan") if isinstance(result, dict) else None,
                context_json=new_context,
            )

            db.commit()

            if isinstance(result, dict):
                result["conversation_id"] = str(conversation_id)

        if req.debug and isinstance(result, dict):
            result["auth"] = auth_ctx.model_dump()

        return JSONResponse(content=jsonable_encoder(result), media_type="application/json; charset=utf-8")

    finally:
        db.close()

# @router.post("/chat")
# def chat(req: ChatRequest):
#     # 1) build auth từ JWT / session (KHÔNG từ body)
#     auth_ctx = build_auth_context()

#     # 2) bắt buộc login
#     if not auth_ctx.is_authenticated or not auth_ctx.user_id or not auth_ctx.role:
#         raise PermissionDenied("Vui lòng đăng nhập để sử dụng chat.")

#     user_id = auth_ctx.user_id

#     db = ChatSessionLocal()
#     try:
#         conversation_id = None

#         # ===== 1) Tạo / lấy conversation (chỉ khi có user_id) =====
#         if req.user_id:
#             conv = get_or_create_conversation(db, user_id=user_id)
#             conversation_id = conv.conversation_id

#         # ===== 2) detect_only: chỉ chạy detector =====
#         if req.detect_only:
#             det_role = auth_ctx.role
#             det = detect_module_llm(message=req.message, role=det_role)
#             if req.debug:
#                 det = {"detector": det, "auth": auth_ctx.model_dump()}
#             # detect_only cũng có thể lưu history nếu bạn muốn; hiện tại bỏ qua cho gọn
#             return JSONResponse(content=jsonable_encoder(det), media_type="application/json; charset=utf-8")

#         # ===== 3) Load memory (context + recent turns) để LLM hiểu "người đó/số đó" =====
#         context_json = fetch_last_context(db, conversation_id) if conversation_id else None
#         recent_msgs = fetch_recent_messages(db, conversation_id, window_minutes=5) if conversation_id else []

#         recent_pairs = []
#         for m in recent_msgs:  # ✅ old -> new
#             if m.role == "user" and m.question:
#                 recent_pairs.append({"role": "user", "content": m.question})
#             elif m.role == "assistant" and m.answer:
#                 recent_pairs.append({"role": "assistant", "content": m.answer})

#         enriched_message = _build_context_prefix(context_json, recent_pairs) + req.message

#         # ===== 5) Đã đăng nhập: chạy unified executor bình thường, nhưng dùng enriched_message =====
#         result = execute_chat_unified(
#             module=req.module,
#             user_id=user_id,
#             role=auth_ctx.role,          # RBAC role thật
#             message=enriched_message,    # ✅ có context
#             compose_enabled=req.compose,
#             debug=req.debug,
#         )

#         # ===== 6) Save history =====
#         if conversation_id:
#             append_message(
#                 db,
#                 conversation_id=conversation_id,
#                 role="user",               # ✅ role tin nhắn
#                 question=req.message,
#                 module=req.module,
#             )

#             new_context = _extract_context_from_result(result if isinstance(result, dict) else {})
#             append_message(
#                 db,
#                 conversation_id=conversation_id,
#                 role="assistant",          # ✅ role tin nhắn (không liên quan RBAC)
#                 answer=(result or {}).get("answer") if isinstance(result, dict) else None,
#                 module=(result or {}).get("selected_module") if isinstance(result, dict) else None,
#                 plan_json=(result or {}).get("plan") if isinstance(result, dict) else None,
#                 context_json=new_context,
#             )

#             db.commit()

#             if isinstance(result, dict):
#                 result["conversation_id"] = str(conversation_id)

#         if req.debug and isinstance(result, dict):
#             result["auth"] = auth_ctx.model_dump()

#         return JSONResponse(content=jsonable_encoder(result), media_type="application/json; charset=utf-8")

#     finally:
#         db.close()