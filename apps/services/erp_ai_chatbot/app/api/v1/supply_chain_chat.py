from fastapi import APIRouter
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from uuid import UUID
from app.ai.executor import execute_chat_supply_chain

router = APIRouter(prefix="/supply_chain")

class ChatRequest(BaseModel):
    module: str = 'supply_chain'
    user_id: UUID | None = None
    role: str | None = None
    message: str
    debug: bool = False
    paraphrase: bool = True 

@router.post("/chat")
def chat(req: ChatRequest):
    result = execute_chat_supply_chain(
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
