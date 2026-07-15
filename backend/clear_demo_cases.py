"""
Removes all seeded demo cases and their
associated data from the database.
Run once: PYTHONPATH=. python3 backend/clear_demo_cases.py
"""

import sys, os
sys.path.insert(0, os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__))))

from backend.database import (
    SessionLocal, init_db)
from backend import models
import shutil

init_db()
db = SessionLocal()

# Names of demo cases to remove
# (from seed_demo.py)
DEMO_CASE_NAMES = [
    "Operation Phantom Trace",
    "Vertex Pharma Leak",
    "Havenport Missing Person",
    "Trial Case",
]

print("Scanning for demo cases...")

removed = 0
for name in DEMO_CASE_NAMES:
    cases = db.query(
        models.Case
    ).filter(
        models.Case.case_name.like(
            f"%{name}%")
    ).all()

    for case in cases:
        print(f"  Removing: {case.case_name}"
              f" (ID: {case.id[:8]})")

        # Delete all related records
        for model_cls in [
            models.QueryLog,
            models.Entity,
            models.Note,
            models.AuditLog,
            models.Evidence,
            models.ForensicArtifact,
            models.WatchlistKeyword,
            models.CaseAccess,
            models.IngestionJob,
        ]:
            try:
                db.query(
                    model_cls
                ).filter(
                    model_cls.case_id ==
                    case.id
                ).delete(
                    synchronize_session=
                        False)
            except Exception as e:
                print(f"    Skip "
                      f"{model_cls.__name__}"
                      f": {e}")

        # Try credential findings
        try:
            db.query(
                models.CredentialFinding
            ).filter(
                models.CredentialFinding
                .case_id == case.id
            ).delete(
                synchronize_session=False)
        except:
            pass

        # Delete the case itself
        db.delete(case)
        db.commit()

        # Remove case files from disk
        from backend.dependencies import (
            get_settings)
        settings = get_settings()
        case_dir = os.path.join(
            settings.cases_dir, case.id)
        if os.path.exists(case_dir):
            shutil.rmtree(
                case_dir,
                ignore_errors=True)
            print(f"    Removed files: "
                  f"{case_dir}")

        removed += 1

db.close()
print(f"\nDone. Removed {removed} "
      f"demo case(s).")
print("The application is ready for "
      "real synthetic data.")
