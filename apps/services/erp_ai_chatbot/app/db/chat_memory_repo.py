# app/db/chat_memory_repo.py
from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID

from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.modules.chat_memory_models import ChatConversation, ChatMessage

def get_or_create_conversation(
    session: Session,
    *,
    conversation_id: Optional[UUID],
    user_id: UUID,
) -> ChatConversation:
    # 1) nếu client gửi conversation_id thì dùng đúng cái đó
    if conversation_id:
        conv = (
            session.query(ChatConversation)
            .filter(ChatConversation.conversation_id == conversation_id)
            .first()
        )
        if conv:
            return conv

    # 2) nếu không gửi -> REUSE conversation mới nhất của user
    last = (
        session.query(ChatConversation)
        .filter(ChatConversation.user_id == user_id)
        .order_by(desc(ChatConversation.created_at))
        .first()
    )
    if last:
        return last

    # 3) nếu chưa có -> tạo mới
    conv = ChatConversation(user_id=user_id)
    session.add(conv)
    session.flush()
    return conv

def fetch_recent_messages(db, conversation_id, limit: int = 20):
    rows = (
        db.query(ChatMessage)
        .filter(ChatMessage.conversation_id == conversation_id)
        .order_by(desc(ChatMessage.created_at))   # ✅ mới nhất trước
        .limit(limit)
        .all()
    )
    return list(reversed(rows))  # ✅ đổi lại thành cũ -> mới để LLM đọc đúng



def fetch_last_context(session: Session, conversation_id: UUID) -> Optional[Dict[str, Any]]:
    last = (
        session.query(ChatMessage)
        .filter(ChatMessage.conversation_id == conversation_id, ChatMessage.context_json.isnot(None))
        .order_by(desc(ChatMessage.created_at))
        .first()
    )
    return dict(last.context_json) if last and last.context_json else None


def append_message(
    session: Session,
    *,
    conversation_id: UUID,
    role: str,
    question: Optional[str] = None,
    answer: Optional[str] = None,
    module: Optional[str] = None,
    plan_json: Optional[Dict[str, Any]] = None,
    context_json: Optional[Dict[str, Any]] = None,
) -> ChatMessage:
    m = ChatMessage(
        conversation_id=conversation_id,
        role=role,
        question=question,
        answer=answer,
        module=module,
        plan_json=plan_json,
        context_json=context_json,
    )
    session.add(m)
    session.flush()
    return m
