# app/db/chat_memory_repo.py
from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID

from sqlalchemy.orm import Session
from sqlalchemy import desc

from apps.services.erp_ai_chatbot.app.modules.rag_policy.chat_memory_models import ChatConversation, ChatMessage

def get_or_create_conversation(db: Session, user_id: UUID) -> ChatConversation:
    conv = (
        db.query(ChatConversation)
        .filter(ChatConversation.user_id == user_id)
        .one_or_none()
    )
    if conv:
        return conv

    conv = ChatConversation(user_id=user_id)
    db.add(conv)
    db.flush()  # lấy conversation_id
    return conv


from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

def fetch_recent_messages(db, conversation_id, window_minutes=5):
    now = datetime.now(ZoneInfo("Asia/Bangkok"))
    since = now - timedelta(minutes=window_minutes)

    return (
        db.query(ChatMessage)
        .filter(ChatMessage.conversation_id == conversation_id)
        .filter(ChatMessage.created_at >= since)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )


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
