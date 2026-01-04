# app/services/ingestion_service.py

import os
from app.core.vectorstore import get_vector_collection
# Import hàm embed_texts mới
from app.core.embedder import embed_texts 
from app.rag.processor import load_and_split_pdf

def ingest_pdf_to_chroma(file_path: str):
    """
    Điều phối toàn bộ quy trình:
    1. Đọc & Chia nhỏ PDF
    2. Lấy Collection từ Chroma
    3. Tạo Embeddings
    4. Nạp dữ liệu vào Chroma
    """
    print(f"--- Bắt đầu quy trình nạp cho file: {file_path} ---")
    
    # 1. Đọc & Chia nhỏ
    chunk_contents = load_and_split_pdf(file_path)
    if not chunk_contents:
        print("Không có nội dung để nạp. Dừng lại.")
        return

    # 2. Lấy Collection
    collection = get_vector_collection()
    
    # 3. Tạo Embeddings (Sử dụng hàm mới)
    print("Đang tạo embeddings cho các chunks...")
    chunk_embeddings = embed_texts(chunk_contents)
    print(f"Đã tạo {len(chunk_embeddings)} embeddings.")

    # 4. Chuẩn bị ID và Metadata
    ids = [f"{os.path.basename(file_path)}_chunk_{i}" for i in range(len(chunk_contents))]
    metadatas = [{"source": os.path.basename(file_path)} for _ in range(len(chunk_contents))]

    # 5. Nạp vào Chroma
    print(f"Đang nạp {len(chunk_contents)} chunks vào ChromaDB...")
    try:
        collection.add(
            embeddings=chunk_embeddings,  # Dùng embeddings đã tạo
            documents=chunk_contents,
            metadatas=metadatas,
            ids=ids
        )
        print("--- Nạp dữ liệu thành công! ---")
    except Exception as e:
        print(f"Lỗi khi nạp vào Chroma: {e}")