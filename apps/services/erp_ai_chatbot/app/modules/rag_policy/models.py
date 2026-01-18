from __future__ import annotations
from sqlalchemy import Column, Integer, String, Text, DateTime, Index
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.sql import func
from app.db.chat_database import ChatBase

class ChatHistory(ChatBase):
    __tablename__ = "chats"

    chat_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(PG_UUID(as_uuid=True), index=True, nullable=True)

    session_id = Column(String(100), index=True, nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_chats_session_id_timestamp", "session_id", "timestamp"),
    )
