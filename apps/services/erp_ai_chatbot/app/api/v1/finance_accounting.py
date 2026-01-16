from fastapi import APIRouter
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel

from apps.services.erp_ai_chatbot.app.ai.executor.executor_finance_accounting import execute_chat_finance_accounting


router = APIRouter(prefix="/finance_accounting")


class ChatRequest(BaseModel):
    module: str = "finance_accounting"
    user_id: int | None = None
    role: str | None = None
    message: str
    debug: bool = False
    paraphrase: bool = True
    compose: bool = True


@router.post("/chat")
def chat(req: ChatRequest):
    result = execute_chat_finance_accounting(
        module=req.module,
        user_id=req.user_id,
        role=req.role,
        message=req.message,
        paraphrase_enabled=req.paraphrase,
        compose_enabled=req.compose,
    )

    if not req.debug:
        out = {"answer": result.get("answer")}
        if "candidates" in result:
            out["candidates"] = result["candidates"]
        return JSONResponse(content=out, media_type="application/json; charset=utf-8")

    return JSONResponse(
        content=jsonable_encoder(result),
        media_type="application/json; charset=utf-8",
    )
