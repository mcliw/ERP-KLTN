from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter()

@router.get("/health")
def health():
    return JSONResponse(content={"status": "ok"}, media_type="application/json; charset=utf-8")
