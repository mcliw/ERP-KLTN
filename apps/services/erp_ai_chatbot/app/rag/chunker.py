from __future__ import annotations
from dataclasses import dataclass
from typing import List

@dataclass
class Chunk:
    chunk_id: str
    doc_id: str
    title: str
    text: str
    start: int
    end: int

# --- THAY ĐỔI Ở ĐÂY ---
# Tăng size lên 1600 để bao trọn các điều khoản luật
# Tăng overlap lên 300 để giữ mạch văn
def chunk_text(doc_id: str, title: str, text: str, chunk_size: int = 1600, overlap: int = 300) -> List[Chunk]:
    s = (text or "").strip()
    if not s:
        return []

    chunks: List[Chunk] = []
    n = len(s)
    i = 0
    k = 0
    
    while i < n:
        # Xác định điểm cắt
        j = min(i + chunk_size, n)
        
        # Lấy text
        chunk_content = s[i:j]
        
        # [Nâng cấp nhỏ]: Nếu cắt cứng, text có thể bị lỗi khoảng trắng đầu đuôi
        # strip() giúp vector đẹp hơn
        chunk_content = chunk_content.strip()

        if chunk_content:
            chunks.append(
                Chunk(
                    chunk_id=f"{doc_id}::c{k}",
                    doc_id=doc_id,
                    title=title,
                    text=chunk_content,
                    start=i,
                    end=j,
                )
            )
            k += 1
        
        if j >= n:
            break
            
        # Tính toán bước nhảy cho vòng lặp sau
        # Đảm bảo không bị lặp vô tận nếu overlap >= chunk_size (dù khó xảy ra)
        step = chunk_size - overlap
        if step <= 0: step = 1 # Fallback an toàn
        
        i += step 

    return chunks