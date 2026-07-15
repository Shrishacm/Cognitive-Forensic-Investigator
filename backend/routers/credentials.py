from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.database import get_db
from backend import models
from backend.auth import get_current_user, require_analyst

router = APIRouter(
    prefix="/api/cases/{case_id}/credentials",
    tags=["Credentials"],
)


# ── List findings ────────────────────────────────────────────────────────────

@router.get("")
def list_credentials(
    case_id: str,
    severity: str = None,
    credential_type: str = None,
    is_confirmed: bool = None,
    is_false_positive: bool = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Returns all credential findings for a case with optional filters."""
    query = db.query(models.CredentialFinding).filter(
        models.CredentialFinding.case_id == case_id
    )

    if severity:
        query = query.filter(models.CredentialFinding.severity == severity)
    if credential_type:
        query = query.filter(models.CredentialFinding.credential_type == credential_type)
    if is_confirmed is not None:
        query = query.filter(models.CredentialFinding.is_confirmed == is_confirmed)
    if is_false_positive is not None:
        query = query.filter(models.CredentialFinding.is_false_positive == is_false_positive)

    findings = query.order_by(models.CredentialFinding.found_at.desc()).all()

    # Severity counts (excluding false positives)
    severity_counts = dict(
        db.query(
            models.CredentialFinding.severity,
            func.count(models.CredentialFinding.id),
        )
        .filter(
            models.CredentialFinding.case_id == case_id,
            models.CredentialFinding.is_false_positive == False,  # noqa: E712
        )
        .group_by(models.CredentialFinding.severity)
        .all()
    )

    return {
        "findings": [
            {
                "id": f.id,
                "credential_type": f.credential_type,
                "severity": f.severity,
                "matched_value": f.matched_value,
                "context": f.context,
                "source_file": f.source_file,
                "internal_path": f.internal_path,
                "is_confirmed": f.is_confirmed,
                "is_false_positive": f.is_false_positive,
                "found_at": str(f.found_at),
            }
            for f in findings
        ],
        "total": len(findings),
        "by_severity": severity_counts,
    }


# ── Toggle confirm ───────────────────────────────────────────────────────────

@router.patch("/{finding_id}/confirm")
def confirm_finding(
    case_id: str,
    finding_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_analyst),
):
    """Toggle the confirmed status of a credential finding."""
    finding = db.query(models.CredentialFinding).filter(
        models.CredentialFinding.id == finding_id,
        models.CredentialFinding.case_id == case_id,
    ).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    finding.is_confirmed = not finding.is_confirmed
    db.commit()
    return {"is_confirmed": finding.is_confirmed}


# ── Toggle false positive ────────────────────────────────────────────────────

@router.patch("/{finding_id}/false-positive")
def mark_false_positive(
    case_id: str,
    finding_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_analyst),
):
    """Toggle the false-positive status of a credential finding."""
    finding = db.query(models.CredentialFinding).filter(
        models.CredentialFinding.id == finding_id,
        models.CredentialFinding.case_id == case_id,
    ).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    finding.is_false_positive = not finding.is_false_positive
    db.commit()
    return {"is_false_positive": finding.is_false_positive}
