# scripts/embed_runner.py

import sys
import os

# --- Thêm đường dẫn dự án vào sys.path ---
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(project_root)
# -------------------------------------

from app.services.ingestion_service import ingest_pdf_to_chroma

def run_ingestion():
    """
    Chạy quy trình nạp dữ liệu cho tất cả file trong kho tri thức.
    """
    
    # TODO: Đảm bảo bạn có file PDF này
    file_name = "a.pdf"
    file_path = os.path.join(project_root, "data", "knowledge_base", file_name)
    
    if not os.path.exists(file_path):
        print(f"LỖI: Không tìm thấy file {file_path}")
        print("Hãy tạo file PDF mẫu trong 'data/knowledge_base/' để chạy.")
        return

    # Chạy service nạp dữ liệu
    ingest_pdf_to_chroma(file_path)

    # (Trong tương lai, bạn có thể lặp (loop) qua tất cả file trong thư mục)

if __name__ == "__main__":
    run_ingestion()