"""
app/database.py — SQLAlchemy engine and session factory.
DATABASE_URL is read from environment via config.py — never hardcoded here.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    # pool_pre_ping keeps connections healthy across network blips
    pool_pre_ping=True,
    # Echo SQL in dev for easier debugging; silent in prod
    echo=(settings.ENV == "development"),
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Shared declarative base — all ORM models inherit from this."""
    pass


# ---------------------------------------------------------------------------
# FastAPI dependency
# ---------------------------------------------------------------------------

def get_db():
    """Yield a database session and guarantee it is closed after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
