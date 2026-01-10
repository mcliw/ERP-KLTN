from sqlalchemy.orm import declarative_base
from app.core.config import settings
from app.db.common import make_engine, make_session_factory

SaleCrmBase = declarative_base()
engine = make_engine(settings.SALE_CRM_DATABASE_URL)
SaleCrmSessionLocal = make_session_factory(engine)
