# scripts/init_db.py

import sys
import os

# --- Thêm đường dẫn dự án vào sys.path (Để chạy) ---
# Thao tác này giúp Python tìm thấy thư mục 'app'
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(project_root)
# -------------------------------------

# Import các thành phần CSDL từ app
from app.db.database import engine, Base, SessionLocal

# --- QUAN TRỌNG: Import các models bạn muốn tạo ---
# Chúng ta chỉ import 'chat_model' để lưu lịch sử hội thoại
from app.db.models import chat_model


def create_tables():
    """
    Tạo tất cả các bảng (models) đã được import
    và kế thừa từ 'Base' (ví dụ: bảng 'chats').
    """
    try:
        print("--- Bắt đầu tạo bảng (Chat)... ---")
        
        # Lệnh này sẽ tìm model 'Chat' và tạo bảng 'chats'
        Base.metadata.create_all(bind=engine)
        
        print("--- Tạo bảng thành công! ---")
    except Exception as e:
        print(f"Lỗi khi tạo bảng: {e}")
        print("Hãy kiểm tra lại chuỗi DATABASE_URL trong file .env và đảm bảo PostgreSQL đang chạy.")

if __name__ == "__main__":
    print("Khởi tạo CSDL (Chỉ tạo các bảng quan hệ như 'chats')...")
    create_tables()
    print("Hoàn tất!")