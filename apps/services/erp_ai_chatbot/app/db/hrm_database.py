from sqlalchemy.orm import declarative_base
from app.core.config import settings
from app.db.common import make_engine, make_session_factory

HrmBase = declarative_base()
engine = make_engine(settings.HRM_DATABASE_URL)
HrmSessionLocal = make_session_factory(engine)
