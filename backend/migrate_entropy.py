"""
Migration: Add shannon_entropy and is_deleted columns
to the forensic_artifacts table.
Run with: PYTHONPATH=. python backend/migrate_entropy.py
"""
from backend.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    for col, definition in [
        ("shannon_entropy", "FLOAT"),
        ("is_deleted",      "BOOLEAN DEFAULT 0")
    ]:
        try:
            conn.execute(text(
                f"ALTER TABLE forensic_artifacts "
                f"ADD COLUMN {col} {definition}"
            ))
            conn.commit()
            print(f"Added column: {col}")
        except Exception as e:
            print(f"{col}: already exists or error — {e}")

print("Entropy migration complete")
