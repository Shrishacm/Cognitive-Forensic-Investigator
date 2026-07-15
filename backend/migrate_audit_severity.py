from backend.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    try:
        conn.execute(text(
            "ALTER TABLE audit_logs "
            "ADD COLUMN severity "
            "TEXT DEFAULT 'info'"
        ))
        print("Added severity column")
    except Exception as e:
        print(f"severity: {e}")

    # Backfill existing records
    from backend.modules.audit_helper import SEVERITY_MAP
    for action, sev in SEVERITY_MAP.items():
        try:
            conn.execute(text(
                f"UPDATE audit_logs "
                f"SET severity = '{sev}' "
                f"WHERE action_type = '{action}'"
            ))
        except:
            pass
    conn.commit()

print("Audit severity migration complete")
