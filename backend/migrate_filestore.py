from backend.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    for col, definition in [
        ("stored_file_path", "TEXT"),
        ("stored_file_size", "INTEGER DEFAULT 0"),
        ("is_viewable", "BOOLEAN DEFAULT 0")
    ]:
        try:
            conn.execute(text(
                f"ALTER TABLE forensic_artifacts "
                f"ADD COLUMN {col} {definition}"
            ))
            print(f"Added {col}")
        except Exception as e:
            print(f"{col}: {e}")
    conn.commit()
print("Filestore migration complete")
