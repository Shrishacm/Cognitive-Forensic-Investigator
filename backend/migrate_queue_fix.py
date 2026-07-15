"""
Migration: Fix ingestion_jobs table to match the IngestionJob model.

Adds missing columns:
  - queue_position  INTEGER DEFAULT 0
  - elapsed_seconds INTEGER DEFAULT 0
  - created_by      VARCHAR(255) DEFAULT 'system'

Reads the database path from the app's Settings via
backend.database.engine — same pattern as all other migrations.
"""

from backend.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    try:
        conn.execute(text(
            "ALTER TABLE ingestion_jobs "
            "ADD COLUMN queue_position "
            "INTEGER DEFAULT 0"
        ))
        print("Added queue_position")
    except Exception as e:
        print(f"queue_position: {e}")

    try:
        conn.execute(text(
            "ALTER TABLE ingestion_jobs "
            "ADD COLUMN elapsed_seconds "
            "INTEGER DEFAULT 0"
        ))
        print("Added elapsed_seconds")
    except Exception as e:
        print(f"elapsed_seconds: {e}")

    try:
        conn.execute(text(
            "ALTER TABLE ingestion_jobs "
            "ADD COLUMN created_by "
            "VARCHAR(255) DEFAULT 'system'"
        ))
        print("Added created_by")
    except Exception as e:
        print(f"created_by: {e}")

    conn.commit()

print("Queue fix migration complete")
