from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    pass


engine = None


def make_session_factory():
    """Allow app import before a local database and driver have been configured."""
    try:
        url = make_url(settings.database_url)
        if "replace-me" in (url.password or "") or settings.secret_key.startswith("development-only-"):
            return None
        global engine
        engine = create_engine(url, pool_pre_ping=True)
        return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    except (ImportError, ModuleNotFoundError, ValueError):
        return None


SessionLocal = make_session_factory()


def get_db():
    if SessionLocal is None:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database is not configured or unavailable.")
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
