# app/db/chat_database.py

from sqlalchemy.orm import declarative_base
from app.core.config import settings
from app.db.common import make_engine, make_session_factory

ChatBase = declarative_base()
engine = make_engine(settings.CHAT_DATABASE_URL)
ChatSessionLocal = make_session_factory(engine)