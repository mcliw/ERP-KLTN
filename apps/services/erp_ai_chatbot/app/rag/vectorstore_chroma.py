from __future__ import annotations
import os
from typing import Any, Dict, List, Optional
import chromadb
from chromadb.config import Settings as ChromaSettings

class ChromaStore:
    def __init__(self, persist_dir: str, collection_name: str):
        self.persist_dir = persist_dir
        self.collection_name = collection_name

        os.makedirs(persist_dir, exist_ok=True)
        self.client = chromadb.PersistentClient(
            path=persist_dir,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        self.col = self.client.get_or_create_collection(name=collection_name)

    def count(self) -> int:
        return int(self.col.count())

    def wipe_all(self) -> int:
        """Xóa sạch mọi record trong collection hiện tại (batch-safe)."""
        total_deleted = 0
        while True:
            batch = self.col.get(limit=1000, include=[])  # lấy 1000 ids/lần
            ids = batch.get("ids") or []
            if not ids:
                break
            self.col.delete(ids=ids)
            total_deleted += len(ids)
        return total_deleted

    def upsert(self, ids: List[str], documents: List[str], metadatas: List[Dict[str, Any]], embeddings: List[List[float]]) -> None:
        self.col.upsert(ids=ids, documents=documents, metadatas=metadatas, embeddings=embeddings)

    def query(self, query_embedding: List[float], top_k: int = 5, where: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        res = self.col.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where=where,
            include=["documents", "metadatas", "distances"],
        )
        out: List[Dict[str, Any]] = []
        ids = (res.get("ids") or [[]])[0]
        docs = (res.get("documents") or [[]])[0]
        metas = (res.get("metadatas") or [[]])[0]
        dists = (res.get("distances") or [[]])[0]
        for i in range(len(ids)):
            out.append({"id": ids[i], "text": docs[i], "meta": metas[i], "distance": dists[i]})
        return out
    
    def peek(self, limit: int = 5) -> list[dict]:
        res = self.col.get(limit=limit, include=["documents", "metadatas"])
        ids = res.get("ids") or []
        docs = res.get("documents") or []
        metas = res.get("metadatas") or []
        out = []
        for i in range(len(ids)):
            out.append({
                "id": ids[i],
                "meta": metas[i],
                "text_preview": (docs[i] or "")[:250]
            })
        return out
