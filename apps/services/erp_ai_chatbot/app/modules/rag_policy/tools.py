from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Any, Dict

from app.ai.tooling import ToolSpec, ok, can_lam_ro
from app.rag.rag_service import RagPolicyService

_svc = RagPolicyService()

class TraCuuChinhSachArgs(BaseModel):
    query: str = Field(..., description="Câu hỏi/chuỗi truy vấn chính sách")
    top_k: int = Field(5, ge=1, le=10, description="Số đoạn tài liệu trả về")

def tra_cuu_chinh_sach_handler(query: str, top_k: int = 5) -> Dict[str, Any]:
    q = (query or "").strip()
    if not q:
        return can_lam_ro("Bạn muốn tra cứu chính sách gì?", [])
    hits = _svc.retrieve(q, top_k=top_k)
    return ok(data={"query": q, "hits": hits}, thong_diep="retrieved")

class BuildIndexArgs(BaseModel):
    rebuild: bool = Field(False, description="Hiện tại upsert luôn; để tương lai hỗ trợ reset.")

def xay_dung_index_chinh_sach_handler(rebuild: bool = True) -> Dict[str, Any]:
    # rebuild mặc định True (luôn reset)
    res = _svc.build_or_update_index(rebuild=rebuild)
    if not res.get("ok"):
        return {"ok": False, "error": res.get("error")}
    return ok(data=res, thong_diep="indexed")

RAG_POLICY_TOOLS = [
    ToolSpec(
        ten_tool="xay_dung_index_chinh_sach",
        mo_ta="Đọc các file *.md chính sách và index vào ChromaDB.",
        args_model=BuildIndexArgs,
        handler=lambda **kwargs: xay_dung_index_chinh_sach_handler(**kwargs),
        module="rag_policy",
        read_only=True,
    ),
    ToolSpec(
        ten_tool="tra_cuu_chinh_sach",
        mo_ta="Tra cứu chính sách nội bộ từ kho tài liệu (RAG).",
        args_model=TraCuuChinhSachArgs,
        handler=lambda query, **_: tra_cuu_chinh_sach_handler(query=query),
        module="rag_policy",
        read_only=True,
    ),
]
