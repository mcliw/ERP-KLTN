# app/core/vectorstore.py

import os
import chromadb

# Tên collection (giống như tên bảng)
COLLECTION_NAME = "erp_knowledge_base"

def get_chroma_client():
    """
    Khởi tạo và trả về ChromaDB client.
    Dữ liệu sẽ được lưu vào thư mục 'chroma_db'.
    """
    # Lấy đường dẫn thư mục gốc của dự án (đi lùi 2 cấp từ file này)
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    db_path = os.path.join(project_root, "chroma_db")
    
    print(f"Đang kết nối ChromaDB tại: {db_path}")
    client = chromadb.PersistentClient(path=db_path)
    return client

def get_vector_collection():
    """
    Lấy collection (bảng) vector từ ChromaDB.
    (Đây là hàm mà file lỗi đang tìm kiếm)
    """
    client = get_chroma_client()
    collection = client.get_or_create_collection(name=COLLECTION_NAME)
    return collection