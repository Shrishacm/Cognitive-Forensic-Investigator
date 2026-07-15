"""
migrate_case_access.py
======================
Ensures the case_access table exists and grants the Admin user
manage-level access to ALL existing cases so nothing breaks after
the access-scoping feature is enabled.

Run:
    PYTHONPATH=. python3 backend/migrate_case_access.py
"""

from backend.database import engine, Base, SessionLocal
from backend import models  # noqa: F401 — registers all ORM classes
import uuid
from datetime import datetime

# Create any missing tables (idempotent)
Base.metadata.create_all(bind=engine)
print("✓ Tables verified / created")

db = SessionLocal()
try:
    # Find all Admin users and grant them access to every case
    admin_users = db.query(models.User).filter(
        models.User.role == "Admin"
    ).all()

    cases = db.query(models.Case).all()
    granted_count = 0

    for admin in admin_users:
        for c in cases:
            existing = db.query(models.CaseAccess).filter(
                models.CaseAccess.case_id == c.id,
                models.CaseAccess.user_id == admin.id,
            ).first()
            if not existing:
                db.add(models.CaseAccess(
                    id=str(uuid.uuid4()),
                    case_id=c.id,
                    user_id=admin.id,
                    granted_by="migration",
                    role_on_case="Investigator",
                ))
                granted_count += 1

    db.commit()
    print(f"✓ Granted admin access to {granted_count} case(s) "
          f"across {len(admin_users)} admin user(s)")
    print(f"  Total cases in DB: {len(cases)}")

finally:
    db.close()

print("✓ CaseAccess migration complete")
