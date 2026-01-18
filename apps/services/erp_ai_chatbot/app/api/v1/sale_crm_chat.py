from fastapi import APIRouter
from pydantic import BaseModel
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from uuid import UUID
from app.ai.executor.executor_sale_crm import execute_chat_sale_crm

router = APIRouter(prefix="/sale_crm")

class ChatRequest(BaseModel):
    module: str = "sale_crm"
    user_id: UUID | None = None
    role: str | None = None
    message: str
    debug: bool = False
    paraphrase: bool = True
    compose: bool = True  

@router.post("/chat")
def chat(req: ChatRequest):
    result = execute_chat_sale_crm(
        module=req.module,
        user_id=req.user_id,
        role=req.role,
        message=req.message,
        paraphrase_enabled=req.paraphrase,
        compose_enabled=req.compose, 
    )

    if not req.debug:
        # bạn có thể giữ y như HRM, hoặc muốn xem composed_used thì thêm vào out
        out = {"answer": result.get("answer")}
        if "candidates" in result:
            out["candidates"] = result["candidates"]
        return JSONResponse(content=out, media_type="application/json; charset=utf-8")

    return JSONResponse(content=jsonable_encoder(result),media_type="application/json; charset=utf-8")   
