from app.db.chat_database import ChatBase, engine
from app.modules.rag_policy.models import ChatHistory  # đảm bảo import để register model

if __name__ == "__main__":
    ChatBase.metadata.create_all(bind=engine)
    print("OK: created chats table")
