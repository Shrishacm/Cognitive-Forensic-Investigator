from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from backend.database import get_db
from backend import models, schemas
from backend.auth import (
    get_current_user,
    require_viewer,
    require_analyst,
    require_investigator,
    require_admin
)
import json

router = APIRouter(
    prefix="/api/cases/{case_id}/audit",
    tags=["Audit"],
)


# ---------------------------------------------------------------------------
# Helper: parse details JSON string → dict
# ---------------------------------------------------------------------------

def _parse_audit(db_audit: models.AuditLog) -> schemas.AuditLogResponse:
    try:
        details = json.loads(db_audit.details) if db_audit.details else {}
    except (json.JSONDecodeError, TypeError):
        details = {}

    return schemas.AuditLogResponse(
        id=db_audit.id,
        case_id=db_audit.case_id,
        action_type=db_audit.action_type,
        performed_by=db_audit.performed_by,
        performed_at=db_audit.performed_at,
        details=details,
        machine_id=db_audit.machine_id,
    )


# ---------------------------------------------------------------------------
# GET /api/cases/{case_id}/audit
# ---------------------------------------------------------------------------

@router.get("", response_model=list[schemas.AuditLogResponse])
def list_audit_logs(
    case_id: str,
    action_type: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_analyst),
):
    """
    Return audit logs for a case ordered by performed_at descending.
    Optionally filter by action_type. Max limit is 500.
    """
    try:
        # Clamp limit
        if limit > 500:
            limit = 500
        if limit < 1:
            limit = 1

        query = db.query(models.AuditLog).filter(
            models.AuditLog.case_id == case_id
        )
        if action_type is not None:
            query = query.filter(models.AuditLog.action_type == action_type)

        audit_logs = (
            query.order_by(models.AuditLog.performed_at.desc())
            .limit(limit)
            .all()
        )
        return [_parse_audit(a) for a in audit_logs]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=schemas.ErrorResponse(
                error="Failed to retrieve audit logs",
                detail=str(exc),
            ).model_dump(),
        )
