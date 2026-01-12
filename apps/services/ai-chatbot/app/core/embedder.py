# app/core/embedder.py

from sentence_transformers import SentenceTransformer
from functools import lru_cache

# Cập nhật tên model theo yêu cầu của bạn
MODEL_NAME = "BAAI/bge-m3"

@lru_cache(maxsize=1) # Dùng cache để chỉ tải model 1 lần
def get_embedding_model():
    """
    Khởi tạo và trả về mô hình embedding BAAI/bge-m3.
    """
    print(f"Đang tải mô hình embedding: {MODEL_NAME}...")
    
    # BGE-M3 yêu cầu 'device' (CPU hoặc CUDA)
    # và 'normalize_embeddings=True' để có hiệu suất tốt nhất
    model = SentenceTransformer(
        MODEL_NAME,
        device="cpu"  # Dùng 'cuda' nếu bạn có GPU
    )
    
    print("Tải mô hình thành công.")
    return model

def embed_texts(texts: list[str]) -> list[list[float]]:
    """
    Tạo embeddings cho một danh sách văn bản.
    BGE-M3 yêu cầu normalize_embeddings=True.
    """
    model = get_embedding_model()
    
    # 'normalize_embeddings=True' rất quan trọng cho BGE
    embeddings = model.encode(texts, normalize_embeddings=True)
    
    return embeddings.tolist()

# --- Hàm cũ - Vẫn giữ lại để tương thích ---
# (Hàm mới 'embed_texts' ở trên tốt hơn)
def embed_text(text: str) -> list[float]:
    """
    Tạo embedding cho một đoạn văn bản duy nhất.
    """
    model = get_embedding_model()
    embedding = model.encode(text, normalize_embeddings=True)
    return embedding.tolist()