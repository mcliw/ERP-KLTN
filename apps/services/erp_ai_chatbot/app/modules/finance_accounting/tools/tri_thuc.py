# app/modules/finance_accounting/tools/tri_thuc.py
from __future__ import annotations
from typing import Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok
import os

KB_DIR = "app/knowledge_base/finance_accounting"

class TraCuuKhoTriThucArgs(BaseModel):
    tu_khoa: str
    limit: int = 5
    max_chars: int = 800

def tra_cuu_kho_tri_thuc(session: Session, tu_khoa: str, limit: int = 5, max_chars: int = 800):
    kw = (tu_khoa or "").strip().lower()
    if not kw:
        return ok({"sources": []}, "Thiếu từ khóa tra cứu.")

    if not os.path.isdir(KB_DIR):
        return ok({"sources": []}, "Chưa cấu hình kho tri thức finance_accounting.")

    hits = []
    for root, _, files in os.walk(KB_DIR):
        for fn in files:
            if not fn.lower().endswith((".txt", ".md")):
                continue
            path = os.path.join(root, fn)
            try:
                content = open(path, "r", encoding="utf-8").read()
            except Exception:
                continue
            low = content.lower()
            idx = low.find(kw)
            if idx >= 0:
                start = max(0, idx - 200)
                end = min(len(content), idx + max_chars)
                snippet = content[start:end].strip()
                hits.append({"file": path, "snippet": snippet})

    hits = hits[:limit]
    return ok({"sources": hits}, "Kết quả tra cứu kho tri thức (read-only).")

TRI_THUC_TOOLS = [
    ToolSpec("tra_cuu_kho_tri_thuc", "Tra cứu hướng dẫn/quy trình nội bộ (read-only).", TraCuuKhoTriThucArgs, tra_cuu_kho_tri_thuc, "finance_accounting"),
]
