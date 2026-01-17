# app/main.py

from fastapi import FastAPI
from app.routers import chat  # <<< 1. IMPORT ROUTER MỚI

app = FastAPI(title="ERP Chatbot AI")

# --- Gắn các routers vào app ---
# Gắn router chat, tất cả API sẽ có tiền tố /api
app.include_router(chat.router, prefix="/api", tags=["Chat"])  # <<< 2. GẮN ROUTER

# (Trong tương lai, bạn sẽ thêm router 'auth' (đăng nhập) ở đây)


@app.get("/")
def read_root():
    return {"message": "Welcome to the ERP Chatbot AI API"}