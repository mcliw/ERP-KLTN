from __future__ import annotations

import os

from app.rag.handle.indexer import rebuild_kb_index


if __name__ == "__main__":
    kb_dir = os.getenv("KB_MD_DIR", "app/rag")
    persist_dir = os.getenv("KB_CHROMA_DIR", "data/chroma_kb")
    res = rebuild_kb_index(kb_dir=kb_dir, persist_dir=persist_dir)
    print(res)
