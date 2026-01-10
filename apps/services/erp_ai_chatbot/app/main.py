from fastapi import FastAPI
from app.api.v1.chat import router as chat_router
from app.api.v1.health import router as health_router

app = FastAPI(title="ERP AI Chatbot")

app.include_router(health_router, prefix="/api/v1")
app.include_router(chat_router, prefix="/api/v1")
