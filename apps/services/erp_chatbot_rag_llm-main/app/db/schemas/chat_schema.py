# app/db/schemas/chat_schema.py

from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class ChatMessage(BaseModel):
    """Một tin nhắn đơn trong lịch sử"""
    role: str # "user" hoặc "assistant"
    content: str

class ChatRequest(BaseModel):
    """Schema cho câu hỏi gửi lên"""
    question: str
    
    # THÊM DÒNG NÀY:
    session_id: str # ID để theo dõi hội thoại


class RAGSource(BaseModel):
    """Schema cho một "nguồn" (chunk) được RAG trích xuất"""
    # Tạm thời dùng 'any' cho doc_id vì nó chưa quan trọng
    doc_id: Any 
    title: Optional[str] = None
    content: str
    source: Optional[str] = None
    score: Optional[float] = None

class ChatResponse(BaseModel):
    """Schema trả về cho câu trả lời của chatbot"""
    answer: str
    response_type: str # Ví dụ: "RAG", "ORDER_STATUS"
    
    # Dành cho FN-1 (RAG)
    sources: Optional[List[RAGSource]] = None
    
    # Dành cho FN-2 & FN-3 (Agent Tools)
    action_data: Optional[Dict[str, Any]] = None

class ChatHistoryOut(BaseModel):
    """Schema trả về lịch sử chat (khi bạn dùng PostgreSQL sau)"""
    chat_id: int
    user_id: Optional[int] = None
    question: str
    answer: str
    timestamp: datetime

    model_config = {
        "from_attributes": True
    }