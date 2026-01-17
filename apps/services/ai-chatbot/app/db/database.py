# app/db/database.py

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Import đối tượng 'settings' từ file config
from app.config import settings

# Lấy chuỗi kết nối TỪ file config, không hardcode ở đây
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL


# Khởi tạo engine
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Tạo SessionLocal (đây là thứ mà chat_service.py đang tìm)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Tạo lớp Base (để các models như chat_model kế thừa)
Base = declarative_base()