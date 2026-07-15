"""
case_access.py — CaseAccess router
Manages which users are assigned to which cases.
Admins see and can access all cases.
Investigators/Analysts only see cases they are assigned to.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models
from backend.auth import get_current_user, require_investigator
from pydantic import BaseModel
import uuid
import json
from datetime import datetime

router = APIRouter(
    prefix="/api/cases/{case_id}/access",
    tags=["CaseAccess"],
)

# Note: the existing CaseAccess model uses `role_on_case` (Investigator/Analyst)
# rather than an access_level string. We map between the two in the API surface
# so the UI can use 'read'/'write'/'manage' labels while we store the role.

_LEVEL_TO_ROLE = {
    "read":   "Analyst",
    "write":  "Investigator",
    "manage": "Investigator",
}
_ROLE_TO_LEVEL = {
    "Analyst":      "read",
    "Investigator": "write",
    "Admin":        "manage",
}


class GrantAccessRequest(BaseModel):
    user_id: str
    access_level: str = "read"   # read | write | manage


# ── Helpers ─────────────────────────────────────────────────────────────────

def _require_case_access(db: Session, case_id: str, user: models.User) -> bool:
    """
    Raises HTTP 403 if the user does not have any access record for this case.
    Admins bypass this check.
    """
    if user.role == "Admin":
        return True
    access = db.query(models.CaseAccess).filter(
        models.CaseAccess.case_id == case_id,
        models.CaseAccess.user_id == user.id,
    ).first()
    if not access:
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this case",
        )
    return True


def check_case_access(
    db: Session,
    case_id: str,
    user: models.User,
    require_write: bool = False,
) -> bool:
    """
    Returns True/False without raising.
    Admins always return True.
    If require_write=True, checks that role_on_case is Investigator.
    """
    if user.role == "Admin":
        return True
    access = db.query(models.CaseAccess).filter(
        models.CaseAccess.case_id == case_id,
        models.CaseAccess.user_id == user.id,
    ).first()
    if not access:
        return False
    if require_write and access.role_on_case not in ("Investigator", "Admin"):
        return False
    return True


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("")
def list_case_access(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Lists all users who have access to this case."""
    _require_case_access(db, case_id, current_user)

    access_list = db.query(models.CaseAccess).filter(
        models.CaseAccess.case_id == case_id
    ).all()

    results = []
    for a in access_list:
        user = db.query(models.User).filter(models.User.id == a.user_id).first()
        results.append({
            "id":           a.id,
            "user_id":      a.user_id,
            "username":     user.username  if user else "Unknown",
            "full_name":    user.full_name if user else "Unknown",
            "role":         user.role      if user else "Unknown",
            # Translate role_on_case → access_level label for the UI
            "access_level": _ROLE_TO_LEVEL.get(a.role_on_case, a.role_on_case),
            "granted_by":   a.granted_by,
            "granted_at":   str(a.granted_at),
        })
    return results


@router.post("", status_code=201)
def grant_access(
    case_id: str,
    body: GrantAccessRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_investigator),
):
    """Grants a user access to a case, or updates an existing access record."""
    # Verify target user exists
    target_user = db.query(models.User).filter(
        models.User.id == body.user_id
    ).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Map access_level → role_on_case
    role_on_case = _LEVEL_TO_ROLE.get(body.access_level, "Analyst")

    # Upsert: if already granted, just update the role
    existing = db.query(models.CaseAccess).filter(
        models.CaseAccess.case_id == case_id,
        models.CaseAccess.user_id == body.user_id,
    ).first()

    if existing:
        existing.role_on_case = role_on_case
        db.commit()
        return {"message": "Access level updated", "id": existing.id}

    # Create new access record
    access = models.CaseAccess(
        id=str(uuid.uuid4()),
        case_id=case_id,
        user_id=body.user_id,
        granted_by=current_user.username,
        role_on_case=role_on_case,
    )
    db.add(access)

    # Audit log
    db.add(models.AuditLog(
        id=str(uuid.uuid4()),
        case_id=case_id,
        action_type="CASE_ACCESS_GRANTED",
        performed_by=current_user.username,
        performed_at=datetime.utcnow(),
        details=json.dumps({
            "target_user":  target_user.username,
            "access_level": body.access_level,
            "role_on_case": role_on_case,
        }),
    ))
    db.commit()
    return {"message": "Access granted", "id": access.id}


@router.delete("/{access_id}")
def revoke_access(
    case_id: str,
    access_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_investigator),
):
    """Revokes a user's access to this case."""
    access = db.query(models.CaseAccess).filter(
        models.CaseAccess.id == access_id,
        models.CaseAccess.case_id == case_id,
    ).first()
    if not access:
        raise HTTPException(status_code=404, detail="Access record not found")

    # Audit
    db.add(models.AuditLog(
        id=str(uuid.uuid4()),
        case_id=case_id,
        action_type="CASE_ACCESS_REVOKED",
        performed_by=current_user.username,
        performed_at=datetime.utcnow(),
        details=json.dumps({"revoked_user_id": access.user_id}),
    ))
    db.delete(access)
    db.commit()
    return {"message": "Access revoked"}
