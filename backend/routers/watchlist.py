from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models
from backend.auth import (
    get_current_user,
    require_analyst,
    require_investigator
)
from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime

router = APIRouter(
    prefix="/api/cases/{case_id}/watchlist",
    tags=["Watchlist"]
)


class KeywordCreate(BaseModel):
    keyword: str
    category: Optional[str] = None


# ---------------------------------------------------------------------------
# GET /api/cases/{case_id}/watchlist
# ---------------------------------------------------------------------------

@router.get("")
def list_keywords(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Return all active watchlist keywords for a case, sorted by hit count."""
    keywords = db.query(
        models.WatchlistKeyword
    ).filter(
        models.WatchlistKeyword.case_id == case_id,
        models.WatchlistKeyword.is_active == True
    ).order_by(
        models.WatchlistKeyword.hit_count.desc()
    ).all()

    return [{
        "id": k.id,
        "keyword": k.keyword,
        "category": k.category,
        "added_by": k.added_by,
        "added_at": str(k.added_at),
        "hit_count": k.hit_count
    } for k in keywords]


# ---------------------------------------------------------------------------
# POST /api/cases/{case_id}/watchlist
# ---------------------------------------------------------------------------

@router.post("", status_code=201)
def add_keyword(
    case_id: str,
    body: KeywordCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_analyst)
):
    """Add a keyword to the watchlist for a case."""
    if not body.keyword.strip():
        raise HTTPException(
            status_code=400,
            detail="Keyword cannot be empty"
        )

    # Check for duplicate
    existing = db.query(
        models.WatchlistKeyword
    ).filter(
        models.WatchlistKeyword.case_id == case_id,
        models.WatchlistKeyword.keyword == body.keyword.strip(),
        models.WatchlistKeyword.is_active == True
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Keyword already exists in this case's watchlist"
        )

    keyword = models.WatchlistKeyword(
        id=str(uuid.uuid4()),
        case_id=case_id,
        keyword=body.keyword.strip(),
        category=body.category,
        added_by=current_user.username
    )
    db.add(keyword)
    db.commit()
    db.refresh(keyword)

    return {
        "id": keyword.id,
        "keyword": keyword.keyword,
        "category": keyword.category,
        "added_by": keyword.added_by,
        "added_at": str(keyword.added_at),
        "hit_count": 0
    }


# ---------------------------------------------------------------------------
# GET /api/cases/{case_id}/watchlist/hits
# Must be declared BEFORE /{keyword_id} to avoid route conflict
# ---------------------------------------------------------------------------

@router.get("/hits")
def get_watchlist_hits(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Returns all artifacts that were flagged during ingestion
    because they matched a watchlist keyword for this case.
    """
    artifacts = db.query(
        models.ForensicArtifact
    ).filter(
        models.ForensicArtifact.case_id == case_id,
        models.ForensicArtifact.is_flagged == True
    ).order_by(
        models.ForensicArtifact.modified_at.desc()
    ).limit(200).all()

    return [{
        "id": a.id,
        "filename": a.filename,
        "internal_path": a.internal_path,
        "modified_at": a.modified_at,
        "extraction_type": a.extraction_type,
        "evidence_id": a.evidence_id,
        "anomaly_reasons": a.anomaly_reasons
    } for a in artifacts]


# ---------------------------------------------------------------------------
# DELETE /api/cases/{case_id}/watchlist/{keyword_id}
# ---------------------------------------------------------------------------

@router.delete("/{keyword_id}")
def remove_keyword(
    case_id: str,
    keyword_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_analyst)
):
    """Soft-delete a watchlist keyword (sets is_active=False)."""
    kw = db.query(
        models.WatchlistKeyword
    ).filter(
        models.WatchlistKeyword.id == keyword_id,
        models.WatchlistKeyword.case_id == case_id
    ).first()

    if not kw:
        raise HTTPException(
            status_code=404,
            detail="Keyword not found"
        )

    kw.is_active = False
    db.commit()
    return {"success": True}
