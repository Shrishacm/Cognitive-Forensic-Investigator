from backend.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    try:
        conn.execute(text(
            "ALTER TABLE forensic_artifacts "
            "ADD COLUMN is_anomaly BOOLEAN "
            "DEFAULT 0"
        ))
        print("Added is_anomaly column")
    except Exception as e:
        print(f"is_anomaly: {e}")
    try:
        conn.execute(text(
            "ALTER TABLE forensic_artifacts "
            "ADD COLUMN anomaly_reasons "
            "TEXT DEFAULT '[]'"
        ))
        print("Added anomaly_reasons column")
    except Exception as e:
        print(f"anomaly_reasons: {e}")
    conn.commit()
print("Migration complete")
