from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine

def make_engine(db_url: str):
    return create_engine(db_url, pool_pre_ping=True)

def make_session_factory(engine):
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)
