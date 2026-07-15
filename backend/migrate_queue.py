from backend.database import engine, Base
from backend import models
from sqlalchemy import text

Base.metadata.create_all(bind=engine)

# Add ingestion_job_id to evidence
with engine.connect() as conn:
    try:
        conn.execute(text(
            "ALTER TABLE evidence "
            "ADD COLUMN ingestion_job_id "
            "TEXT"
        ))
        print("Added ingestion_job_id")
    except Exception as e:
        print(f"ingestion_job_id: {e}")
    conn.commit()
print("Queue migration complete")
