# app/rag/processor.py

import os # << Thêm 'import os'
# THAY ĐỔI DÒNG NÀY:
from langchain_text_splitters import RecursiveCharacterTextSplitter
# TỪ DÒNG CŨ: from langchain.text_splitter import RecursiveCharacterTextSplitter

from langchain_community.document_loaders import PyPDFLoader
from typing import List

def get_text_splitter() -> RecursiveCharacterTextSplitter:
    """
    Khởi tạo và trả về bộ chia văn bản.
    """
    return RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=100
    )

def load_and_split_pdf(file_path: str) -> List[str]:
    """
    Tải file PDF, chia nhỏ và trả về danh sách các chunks (đoạn văn).
    """
    print(f"Đang tải file: {file_path}...")
    if not os.path.exists(file_path):
        print(f"LỖI: Không tìm thấy file {file_path}")
        return []

    try:
        loader = PyPDFLoader(file_path)
        documents = loader.load()
        
        text_splitter = get_text_splitter()
        chunks = text_splitter.split_documents(documents)
        
        # Chỉ lấy nội dung text từ các chunks
        chunk_contents = [chunk.page_content for chunk in chunks]
        print(f"Đã chia file thành {len(chunk_contents)} chunks.")
        return chunk_contents
        
    except Exception as e:
        print(f"Lỗi khi xử lý PDF: {e}")
        return []