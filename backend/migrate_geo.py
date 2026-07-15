"""
Migration: Add gps_latitude and gps_longitude columns
to forensic_artifacts table.
Run with: PYTHONPATH=. python backend/migrate_geo.py
"""
from backend.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    for col in [
        "gps_latitude  FLOAT",
        "gps_longitude FLOAT"
    ]:
        col_name = col.split()[0]
        try:
            conn.execute(text(
                f"ALTER TABLE forensic_artifacts "
                f"ADD COLUMN {col}"
            ))
            conn.commit()
            print(f"Added column: {col_name}")
        except Exception as e:
            print(f"{col_name}: already exists or error — {e}")

print("Geo migration complete")
