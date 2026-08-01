from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
from backend.dependencies import get_settings

settings = get_settings()

engine = create_engine(
    settings.database_url,
    connect_args={
        "check_same_thread": False,
        "timeout": 30,           # Wait up to 30s if DB is locked before raising
    },
    pool_size=10,
    max_overflow=20,
    echo=settings.debug
)

# Enable WAL (Write-Ahead Logging) — allows concurrent reads during writes
# This is the #1 fix for "database is locked" in SQLite multi-thread environments
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.execute("PRAGMA busy_timeout=30000")  # 30 second busy timeout
    cursor.close()

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
