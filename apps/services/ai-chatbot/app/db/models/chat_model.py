# app/db/models/chat_model.py

from sqlalchemy import Column, Integer, Text, DateTime, String, Index
from sqlalchemy.sql import func

# Import lớp 'Base' từ file database.py (nằm ở app/db/database.py)
from app.db.database import Base

class Chat(Base):
    """
    Đây là Model đại diện cho bảng 'chats' trong PostgreSQL,
    dùng để lưu lịch sử hội thoại.
    """
    __tablename__ = "chats"

    chat_id = Column(Integer, primary_key=True, index=True)
    
    # Dùng session_id để nhóm các tin nhắn trong cùng 1 hội thoại
    session_id = Column(String(100), index=True, nullable=False)
    
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    # Thêm Index (chỉ mục) để tăng tốc độ truy vấn lịch sử
    __table_args__ = (Index('ix_chats_session_id_timestamp', 'session_id', 'timestamp'),)