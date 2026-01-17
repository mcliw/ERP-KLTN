# app/rag/retriever.py

from app.core.vectorstore import get_vector_collection
from app.core.embedder import embed_texts  # Import hàm embed_texts

def query_vectorstore(query: str, n_results: int = 3) -> dict:
    """
    Nhận một câu hỏi (string), thêm instruction, nhúng nó, và truy vấn ChromaDB.
    """
    try:
        collection = get_vector_collection()
        
        # --- SỬA LỖI SEARCH SAI ---
        # Model BAAI/bge-m3 yêu cầu thêm instruction này vào TRƯỚC
        # câu hỏi khi tìm kiếm (query) để có kết quả chính xác.
        instruction = "Represent this sentence for searching relevant passages: "
        query_with_instruction = instruction + query
        
        # 1. Nhúng câu hỏi đã có instruction
        # Hàm embed_texts mong đợi một danh sách, nên ta truyền [query_with_instruction]
        query_embedding = embed_texts([query_with_instruction])[0] # Lấy vector đầu tiên
        
        # 2. Truy vấn ChromaDB
        print(f"Đang truy vấn Chroma với câu hỏi: '{query_with_instruction}'")
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results
        )
        
        return results
        
    except Exception as e:
        print(f"Lỗi khi truy vấn vector store: {e}")
        # Trả về cấu trúc rỗng nếu lỗi
        return {"ids": [[]], "documents": [[]], "metadatas": [[]]}