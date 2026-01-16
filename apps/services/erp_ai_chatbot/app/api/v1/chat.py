from fastapi import APIRouter
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel

from app.ai.executor.executor_chat import execute_chat_unified
from app.ai.module_detector import detect_module_llm

router = APIRouter()

class ChatRequest(BaseModel):
    user_id: int | None = None
    role: str | None = None
    module: str = "auto"
    message: str
    debug: bool = False
    paraphrase: bool = True
    compose: bool = True

    detect_only: bool = False   # ✅ NEW

@router.post("/chat")
def chat(req: ChatRequest):
    # ✅ chỉ chạy detector, không chạy executor/tools/compose
    if req.detect_only:
        det = detect_module_llm(message=req.message, role=req.role)
        return JSONResponse(content=jsonable_encoder(det), media_type="application/json; charset=utf-8")

    result = execute_chat_unified(
        module=req.module,
        user_id=req.user_id,
        role=req.role,
        message=req.message,
        paraphrase_enabled=req.paraphrase,
        compose_enabled=req.compose,
        debug=req.debug,
    )
    return JSONResponse(content=jsonable_encoder(result), media_type="application/json; charset=utf-8")
