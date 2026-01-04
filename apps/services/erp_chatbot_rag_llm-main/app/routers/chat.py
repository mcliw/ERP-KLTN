# app/routers/chat.py

from fastapi import APIRouter
from app.db.schemas.chat_schema import ChatRequest, ChatResponse
from app.services import chat_service

# Khởi tạo router
router = APIRouter()

@router.post("/chat", response_model=ChatResponse)
def handle_chat_endpoint(request: ChatRequest):
    """
    Endpoint chính để xử lý chat của người dùng.
    """
    # 1. Nhận ChatRequest (chứa câu hỏi)
    # 2. Gọi service để xử lý
    response = chat_service.handle_chat_message(request)
    
    # 3. Trả về ChatResponse
    return response