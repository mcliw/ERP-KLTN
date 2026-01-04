# app/services/chat_service.py

from app.db.schemas.chat_schema import ChatRequest, ChatResponse, RAGSource, ChatMessage
from app.rag.retriever import query_vectorstore
import google.generativeai as genai
from app.config import settings

# --- IMPORT CHO POSTGRESQL ---
from app.db.database import SessionLocal # Kết nối CSDL
from app.db.models.chat_model import Chat # Model bảng Chats
from sqlalchemy.orm import Session
# ------------------------------

# Cấu hình Google AI
try:
    genai.configure(api_key=settings.GOOGLE_API_KEY)
    llm_model = genai.GenerativeModel('gemini-2.0-flash-lite')
    print("Đã cấu hình Google Generative AI thành công.")
except Exception as e:
    print(f"LỖI: Không thể cấu hình Google AI. Kiểm tra API Key: {e}")
    llm_model = None

# HÀM MỚI: Tải lịch sử chat
def _load_history(db: Session, session_id: str, limit: int = 5) -> list[ChatMessage]:
    """Tải 'limit' tin nhắn cuối cùng từ CSDL PostgreSQL."""
    history_models = db.query(Chat).filter(Chat.session_id == session_id).order_by(Chat.timestamp.desc()).limit(limit).all()
    
    # Đảo ngược lại để có thứ tự cronological (cũ -> mới)
    history_models.reverse() 
    
    history_messages = []
    for chat in history_models:
        history_messages.append(ChatMessage(role="user", content=chat.question))
        history_messages.append(ChatMessage(role="assistant", content=chat.answer))
        
    return history_messages

# HÀM MỚI: Lưu lịch sử chat
def _save_history(db: Session, session_id: str, question: str, answer: str):
    """Lưu câu hỏi và trả lời vào CSDL PostgreSQL."""
    try:
        new_chat = Chat(
            session_id=session_id,
            question=question,
            answer=answer
        )
        db.add(new_chat)
        db.commit()
    except Exception as e:
        print(f"Lỗi khi lưu lịch sử chat: {e}")
        db.rollback()

# CẬP NHẬT HÀM NÀY
def build_rag_prompt(query: str, context_chunks: list[str], history: list[ChatMessage]) -> str:
    """Xây dựng prompt với Lịch sử chat (history) và Ngữ cảnh (context)."""
    
    context = "\n\n---\n\n".join(context_chunks)
    
    # Format lịch sử chat
    history_str = ""
    if history:
        history_str = "Dưới đây là lịch sử trò chuyện gần đây:\n"
        for msg in history:
            history_str += f"{msg.role}: {msg.content}\n"
        history_str += "\n"

    prompt = f"""
    Bạn là một trợ lý AI hữu ích. Nhiệm vụ của bạn là trả lời câu hỏi của người dùng.

    {history_str} 
    
    Dưới đây là một số NGỮ CẢNH (context) liên quan đến câu hỏi MỚI NHẤT của người dùng.
    Hãy dùng chúng để trả lời nếu chúng liên quan.

    NGỮ CẢNH:
    {context}

    CÂU HỎI MỚI NHẤT:
    {query}

    HƯỚNG DẪN:
    1. Trả lời câu hỏi MỚI NHẤT.
    2. Sử dụng LỊCH SỬ TRÒ CHUYỆN để hiểu các tham chiếu (ví dụ: "nó", "anh ấy", "vấn đề đó").
    3. Chỉ trả lời dựa vào NGỮ CẢNH nếu câu hỏi yêu cầu thông tin từ tài liệu.
    4. Nếu NGỮ CẢNH không chứa thông tin, hãy nói "Tôi không tìm thấy thông tin này trong tài liệu."
    5. Trả lời bằng tiếng Việt.

    TRẢ LỜI:
    """
    return prompt

# CẬP NHẬT HÀM NÀY
def handle_chat_message(request: ChatRequest) -> ChatResponse:
    
    # --- PHẦN BỊ LỖI LÀ Ở ĐÂY ---
    if not llm_model:
        # Bạn đã thiếu khối code được thụt vào này:
        return ChatResponse(
            answer="LỖI: Mô hình LLM chưa được cấu hình. Vui lòng kiểm tra GOOGLE_API_KEY.",
            response_type="RAG_ERROR",
            sources=[]
        )
    # ----------------------------
        
    query = request.question
    session_id = request.session_id # Lấy session_id từ request
    
    # 0. Khởi tạo session CSDL PostgreSQL
    db: Session = SessionLocal()
    
    try:
        # 1. Tải Lịch sử (MỚI)
        history = _load_history(db, session_id)

        # 2. Gọi Retriever (R) (Như cũ)
        retrieval_results = query_vectorstore(query, n_results=3)
        documents = retrieval_results.get('documents', [[]])[0]
        metadatas = retrieval_results.get('metadatas', [[]])[0]
        
        # Tạo danh sách các nguồn (sources) để trả về
        sources = [] 
        if documents:
            for i, doc_content in enumerate(documents):
                meta = metadatas[i] if i < len(metadatas) else {}
                source_file = meta.get('source', 'Không rõ')
                sources.append(
                    RAGSource(
                        doc_id=i, 
                        title=source_file,
                        content=doc_content,
                        source=source_file,
                        score=None 
                    )
                )

        # 3. Tích hợp LLM (G) - Cập nhật
        prompt = build_rag_prompt(query, documents, history) # <<< Đưa 'history' vào
        
        # Cài đặt độ sáng tạo (temperature)
        generation_config = genai.types.GenerationConfig(
            temperature=0.3  # Tăng độ sáng tạo (từ 0.0 đến 1.0)
        )

        # Gọi LLM
        print("Đang gọi LLM (với temperature=0.3) để tạo câu trả lời...")
        llm_response = llm_model.generate_content(
            prompt,
            generation_config=generation_config # <<< Đưa cài đặt vào
        )
        final_answer = llm_response.text
        
        print("Đang gọi LLM (với history) để tạo câu trả lời...")
        llm_response = llm_model.generate_content(prompt)
        final_answer = llm_response.text
        
        # 4. Lưu Lịch sử (MỚI)
        _save_history(db, session_id, query, final_answer)

    except Exception as e:
        print(f"Lỗi nghiêm trọng trong handle_chat_message: {e}")
        final_answer = f"Gặp lỗi khi xử lý: {e}"
        sources = [] # Đảm bảo sources là list rỗng khi lỗi
    finally:
        # LUÔN LUÔN đóng session CSDL
        db.close() 

    # 5. Trả về kết quả
    return ChatResponse(
        answer=final_answer,
        response_type="RAG_WITH_HISTORY",
        sources=sources
    )