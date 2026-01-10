from sqlalchemy.orm import declarative_base
from app.core.config import settings
from app.db.common import make_engine, make_session_factory

SupplyChainBase = declarative_base()
engine = make_engine(settings.SUPPLY_CHAIN_DATABASE_URL)
SupplyChainSessionLocal = make_session_factory(engine)
