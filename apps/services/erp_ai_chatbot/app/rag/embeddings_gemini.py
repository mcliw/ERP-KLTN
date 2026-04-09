from __future__ import annotations
import os
from typing import List
from dotenv import load_dotenv
from google import genai

load_dotenv()

_GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY_1") or os.getenv("GOOGLE_API_KEY_1")
_EMBED_MODEL = os.getenv("GEMINI_EMBED_MODEL", "gemini-embedding-001")

_client = genai.Client(api_key=_GEMINI_API_KEY) if _GEMINI_API_KEY else genai.Client()

def embed_texts(texts: List[str]) -> List[List[float]]:
    # Gemini embeddings: batch theo list
    # Lưu ý: SDK genai có thể thay đổi; cách này đang dùng interface phổ biến.
    resp = _client.models.embed_content(
        model=_EMBED_MODEL,
        contents=texts,
    )
    # resp.embeddings: list[Embedding], mỗi embedding.values là vector
    out: List[List[float]] = []
    for e in getattr(resp, "embeddings", []) or []:
        out.append(list(getattr(e, "values", []) or []))
    return out
