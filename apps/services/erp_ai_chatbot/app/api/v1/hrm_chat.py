from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from fastapi.encoders import jsonable_encoder
from app.ai.executor.executor_hrm import execute_chat_hrm 

router = APIRouter(prefix="/hrm")

class ChatRequest(BaseModel):
    module: str = "hrm"
    user_id: int | None = None
    role: str | None = None
    message: str
    debug: bool = False
    paraphrase: bool = True

@router.post("/chat")
def chat(req: ChatRequest):
    result = execute_chat_hrm(
        module=req.module,
        user_id=req.user_id,
        role=req.role,
        message=req.message,
        paraphrase_enabled=req.paraphrase,
    )

    if not req.debug:
        out = {"answer": result.get("answer")}
        if "candidates" in result:
            out["candidates"] = result["candidates"]
        return JSONResponse(content=out, media_type="application/json; charset=utf-8")

    return JSONResponse(content=jsonable_encoder(result),media_type="application/json; charset=utf-8")   
