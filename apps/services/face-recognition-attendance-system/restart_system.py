import os
import shutil
import glob
from sqlalchemy import create_engine, MetaData
from app.database import DATABASE_URL

def reset_system():
    print("⚠️  CẢNH BÁO: HÀNH ĐỘNG NÀY SẼ XÓA SẠCH TOÀN BỘ DỮ LIỆU!")
    confirm = input(">>> Bạn có chắc chắn muốn reset không? (gõ 'yes' để đồng ý): ")
    
    if confirm.lower() != 'yes':
        print("Đã hủy thao tác.")
        return

    print("\n🚀 BẮT ĐẦU DỌN DẸP HỆ THỐNG...")

    # 1. XÓA FILE VÀ THƯ MỤC TRÊN Ổ CỨNG
    folders_to_delete = ["chroma_db", "dataset", "model_save"]
    
    for folder in folders_to_delete:
        if os.path.exists(folder):
            try:
                # shutil.rmtree xóa cả thư mục lẫn file bên trong
                shutil.rmtree(folder)
                print(f"✅ Đã xóa thư mục: {folder}")
            except Exception as e:
                print(f"❌ Lỗi xóa {folder}: {e}")
        else:
            print(f"ℹ️  Thư mục {folder} không tồn tại (đã sạch).")

    # 2. XÓA DỮ LIỆU TRONG POSTGRESQL (DROP TABLES)
    print("\n🔄 Đang xóa bảng trong PostgreSQL...")
    try:
        engine = create_engine(DATABASE_URL)
        meta = MetaData()
        meta.reflect(bind=engine)
        
        # Xóa tất cả các bảng (theo thứ tự quan hệ khóa ngoại)
        meta.drop_all(bind=engine)
        print("✅ Đã xóa sạch các bảng trong Database.")
    except Exception as e:
        print(f"❌ Lỗi Database: {e}")
        print("👉 Gợi ý: Nếu lỗi này, hãy vào pgAdmin xóa tay database 'attendance_db' rồi tạo lại.")

    print("\n✨ HỆ THỐNG ĐÃ SẠCH SẼ NHƯ MỚI!")
    print("👉 Bước tiếp theo: Chạy 'python main.py' để khởi tạo lại từ đầu.")

if __name__ == "__main__":
    reset_system()