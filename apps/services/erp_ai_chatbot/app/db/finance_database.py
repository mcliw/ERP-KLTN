from sqlalchemy.orm import declarative_base
from app.core.config import settings
from app.db.common import make_engine, make_session_factory

FinanceBase = declarative_base()
engine = make_engine(settings.FINANCE_DATABASE_URL)
FinanceSessionLocal = make_session_factory(engine)
