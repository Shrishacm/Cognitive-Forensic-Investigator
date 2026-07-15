from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from backend.dependencies import get_settings

settings = get_settings()

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},
    echo=settings.debug
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def get_db():
    """
    FastAPI dependency that provides a database session.
    Always closes the session after the request.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Creates all tables if they do not exist.
    Called once on app startup.
    """
    from backend import models  # noqa: F401 — import needed to register models with Base
    Base.metadata.create_all(bind=engine)
