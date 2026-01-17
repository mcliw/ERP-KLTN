# app/db/models/chat_model.py

from sqlalchemy import Column, Integer, Text, DateTime, String, Index
from sqlalchemy.sql import func
from app.db.database import Base

class Chat(Base):
    __tablename__ = "chats"

    chat_id = Column(Integer, primary_key=True, index=True) #

    # Thêm session_id để nhóm các tin nhắn
    session_id = Column(String(100), index=True, nullable=False)

    question = Column(Text, nullable=False) #
    answer = Column(Text, nullable=False) #

    timestamp = Column(DateTime(timezone=True), server_default=func.now()) #

    # Thêm Index để tăng tốc độ truy vấn lịch sử
    __table_args__ = (Index('ix_chats_session_id_timestamp', 'session_id', 'timestamp'),)