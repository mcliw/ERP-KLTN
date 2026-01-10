from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from app.ai.executor import execute_chat

router = APIRouter()

class ChatRequest(BaseModel):
    module: str
    user_id: int | None = None
    role: str | None = None
    message: str
    debug: bool = False
    paraphrase: bool = True  # NEW

@router.post("/chat")
def chat(req: ChatRequest):
    result = execute_chat(
        module=req.module,
        user_id=req.user_id,
        role=req.role,
        message=req.message,
        paraphrase_enabled=req.paraphrase
    )

    if not req.debug:
        out = {"answer": result.get("answer")}
        if "candidates" in result:
            out["candidates"] = result["candidates"]
        return JSONResponse(content=out, media_type="application/json; charset=utf-8")

    return JSONResponse(content=result, media_type="application/json; charset=utf-8")
