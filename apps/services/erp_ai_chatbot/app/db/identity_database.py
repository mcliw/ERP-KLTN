# app/db/identity_database.py

from sqlalchemy.orm import declarative_base
from app.core.config import settings
from app.db.common import make_engine, make_session_factory

IdentityBase = declarative_base()
engine = make_engine(settings.IDENTITY_DATABASE_URL)
IdentitySessionLocal = make_session_factory(engine)