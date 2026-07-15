"""
Migration script — creates the credential_findings table.
Run: PYTHONPATH=. python3 backend/migrate_credentials.py
"""
from backend.database import engine, Base
from backend import models  # noqa: F401 — ensures CredentialFinding is registered

Base.metadata.create_all(bind=engine)
print("✓ credential_findings table created")
