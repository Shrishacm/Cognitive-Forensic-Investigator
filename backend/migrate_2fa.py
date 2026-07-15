from backend.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    for col, definition in [
        ("totp_secret", "TEXT"),
        ("totp_enabled", "BOOLEAN DEFAULT 0")
    ]:
        try:
            conn.execute(text(
                f"ALTER TABLE users "
                f"ADD COLUMN {col} "
                f"{definition}"
            ))
            print(f"Added {col}")
        except Exception as e:
            print(f"{col}: {e}")
    conn.commit()
print("2FA migration complete")
