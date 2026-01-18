from fastapi import APIRouter
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel, Field

from app.modules.rag_policy.tools import xay_dung_index_chinh_sach_handler
from app.rag.rag_service import RagPolicyService

router = APIRouter(prefix="/rag_policy")

class IndexReq(BaseModel):
    rebuild: bool = True

@router.post("/index")
def build_index(req: IndexReq = IndexReq()):
    res = xay_dung_index_chinh_sach_handler(rebuild=req.rebuild)
    return JSONResponse(content=jsonable_encoder(res), media_type="application/json; charset=utf-8")

class AskReq(BaseModel):
    question: str
    top_k: int = Field(5, ge=1, le=10)
    debug: bool = False  # nếu true thì trả thêm hits

@router.post("/ask")
def ask(req: AskReq):
    svc = RagPolicyService()
    res = svc.answer(req.question, top_k=req.top_k)

    if not res.get("ok"):
        return JSONResponse(content=jsonable_encoder(res), status_code=400, media_type="application/json; charset=utf-8")

    if req.debug:
        return JSONResponse(content=jsonable_encoder(res), media_type="application/json; charset=utf-8")

    # trả gọn cho user
    out = {"ok": True, "answer": res["answer"], "sources": res["sources"]}
    return JSONResponse(content=jsonable_encoder(out), media_type="application/json; charset=utf-8")
