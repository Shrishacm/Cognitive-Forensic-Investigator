"""
Migration: Create watchlist_keywords table
Run with: python backend/migrate_watchlist.py
"""
from backend.database import engine, Base
from backend import models  # noqa: F401 — ensures all models are registered

Base.metadata.create_all(bind=engine)
print("Watchlist table created (or already exists)")
