from fastapi import APIRouter
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel

from uuid import UUID

from app.ai.executor.executor_chat import execute_chat_unified
from app.ai.module_detector import detect_module_llm

from app.core.role.auth_context import build_auth_context
from app.core.errors import PermissionDenied

router = APIRouter()

class ChatRequest(BaseModel):
    user_id: UUID | None = None
    role: str | None = None
    module: str = "auto"
    message: str
    debug: bool = False
    compose: bool = True
    detect_only: bool = False

@router.post("/chat")
def chat(req: ChatRequest):
    # 1) build auth từ identity (role/perms thật)
    auth_ctx = build_auth_context(user_id=req.user_id)

    # 2) detect_only: chỉ chạy detector
    if req.detect_only:
        det_role = auth_ctx.role or req.role
        det = detect_module_llm(message=req.message, role=det_role)
        if req.debug:
            det = {"detector": det, "auth": auth_ctx.model_dump()}
        return JSONResponse(content=jsonable_encoder(det), media_type="application/json; charset=utf-8")

    # 3) Nếu chưa đăng nhập: CHỈ cho phép rag_policy (public)
    if not auth_ctx.is_authenticated or not auth_ctx.role:
        det = detect_module_llm(message=req.message, role=req.role)
        if det.get("selected_module") == "rag_policy" and not det.get("needs_clarification", False):
            result = execute_chat_unified(
                module="rag_policy",     # ép vào rag_policy
                user_id=req.user_id,
                role=None,               # public
                message=req.message,
                compose_enabled=req.compose,
                debug=req.debug,
            )
            if req.debug and isinstance(result, dict):
                result["detector"] = det
            return JSONResponse(content=jsonable_encoder(result), media_type="application/json; charset=utf-8")

        raise PermissionDenied("Bạn không có quyền truy cập.")


    # 4) gọi unified executor, truyền role thật (không dùng req.role)
    result = execute_chat_unified(
        module=req.module,
        user_id=req.user_id,
        role=auth_ctx.role,            # ✅ role thật từ identity
        message=req.message,
        compose_enabled=req.compose,
        debug=req.debug,
    )

    if req.debug and isinstance(result, dict):
        result["auth"] = auth_ctx.model_dump()

    return JSONResponse(content=jsonable_encoder(result), media_type="application/json; charset=utf-8")