from __future__ import annotations
from pathlib import Path
from typing import List, Dict, Any
from pydantic import BaseModel, Field

from app.ai.tooling import ToolSpec, ok, can_lam_ro

KB_DIR = Path(__file__).resolve().parents[3] / "knowledge_base" / "supply_chain"

class TraCuuKhoTriThucArgs(BaseModel):
    cau_hoi: str = Field(..., description="Câu hỏi về chính sách, hướng dẫn, FAQ, bảo hành/đổi trả/vận chuyển...")
    top_k: int = 4

def _tokenize(s: str) -> List[str]:
    s = (s or "").lower()
    # tách thô theo khoảng trắng, loại token ngắn
    toks = [t.strip(".,:;!?()[]{}\"'") for t in s.split()]
    toks = [t for t in toks if len(t) >= 2]
    return toks

def _score(text: str, toks: List[str]) -> int:
    t = text.lower()
    return sum(t.count(tok) for tok in toks)

def _snippet(text: str, toks: List[str], max_len: int = 420) -> str:
    t = text.lower()
    # tìm vị trí match đầu tiên
    pos = None
    for tok in toks:
        i = t.find(tok)
        if i != -1:
            pos = i
            break
    if pos is None:
        return (text[:max_len] + "...") if len(text) > max_len else text
    start = max(0, pos - 160)
    end = min(len(text), start + max_len)
    sn = text[start:end]
    if start > 0: sn = "..." + sn
    if end < len(text): sn = sn + "..."
    return sn

def tra_cuu_kho_tri_thuc(session, cau_hoi: str, top_k: int = 4):
    # session không dùng, để đồng nhất signature tool
    if not KB_DIR.exists():
        return can_lam_ro(
            "Chưa có kho tri thức. Bạn tạo thư mục app/knowledge_base/supply_chain và thêm file .txt vào đó.",
            []
        )

    files = sorted(KB_DIR.glob("*.txt"))
    if not files:
        return can_lam_ro(
            "Kho tri thức chưa có file .txt nào. Bạn copy tài liệu .txt vào app/knowledge_base/supply_chain.",
            []
        )

    toks = _tokenize(cau_hoi)
    if not toks:
        return can_lam_ro("Bạn nhập câu hỏi rõ hơn (có từ khóa chính).", [])

    scored: List[Dict[str, Any]] = []
    for fp in files:
        try:
            text = fp.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        s = _score(text, toks)
        if s > 0:
            scored.append({
                "source": fp.name,
                "score": s,
                "snippet": _snippet(text, toks)
            })

    if not scored:
        return can_lam_ro(
            "Không tìm thấy nội dung phù hợp trong kho tri thức. Bạn thử nêu từ khóa cụ thể hơn.",
            [f.name for f in files]
        )

    scored.sort(key=lambda x: x["score"], reverse=True)
    top = scored[:max(1, min(int(top_k), 8))]

    # extractive answer: lấy snippet tốt nhất
    answer = top[0]["snippet"]

    return ok({
        "answer": answer,
        "sources": top
    }, "Tra cứu kho tri thức (RAG dạng trích đoạn).")

RAG_TOOLS = [
    ToolSpec(
        "tra_cuu_kho_tri_thuc",
        "Tra cứu kho tri thức (txt) cho chính sách/hướng dẫn/FAQ. Trả về trích đoạn + nguồn.",
        TraCuuKhoTriThucArgs,
        tra_cuu_kho_tri_thuc,
        "supply_chain"
    )
]
