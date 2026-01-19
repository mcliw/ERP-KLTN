#apps\services\erp_ai_chatbot\app\modules\chat_memory_models.py
from __future__ import annotations

from uuid import uuid4
from sqlalchemy import Column, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB

from app.db.chat_database import ChatBase  # đúng file bạn có

class ChatConversation(ChatBase):
    __tablename__ = "chat_conversation"

    conversation_id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(PG_UUID(as_uuid=True), nullable=False)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    messages = relationship("ChatMessage", back_populates="conversation", cascade="all, delete-orphan")

class ChatMessage(ChatBase):
    __tablename__ = "chat_message"

    message_id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    conversation_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("chat_conversation.conversation_id", ondelete="CASCADE"),
        nullable=False,
    )

    role = Column(String(10), nullable=False)  # user/assistant/system
    question = Column(Text, nullable=True)
    answer = Column(Text, nullable=True)

    module = Column(String(50), nullable=True)
    plan_json = Column(JSONB, nullable=True)
    context_json = Column(JSONB, nullable=True)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    conversation = relationship("ChatConversation", back_populates="messages")
