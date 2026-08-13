from fastapi import (
    APIRouter, Depends, HTTPException,
    BackgroundTasks)
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models
from backend.auth import (
    get_current_user, require_investigator, require_analyst)
from backend.modules.time_estimator import (
    estimate_ingestion_time,
    estimate_queue_total)
from backend.modules.resource_governor import (
    get_system_info, suggest_resource_budget, get_gpu_info)
from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime
import re
import os

router = APIRouter(
    prefix="/queue",
    tags=["Ingestion Queue"]
)

class QueueJobRequest(BaseModel):
    evidence_id: str
    case_id: str
    min_free_ram_mb: int = 2048
    cpu_throttle_percent: int = 70
    analysis_mode: str = "normal"  # fastest | normal | accurate

class BulkQueueRequest(BaseModel):
    jobs: list[QueueJobRequest]

class HardwarePreferenceRequest(BaseModel):
    hardware_mode: str  # "auto", "cuda", "cpu"
    vector_embedding_device: Optional[str] = "auto"
    whisper_device: Optional[str] = "auto"

@router.get("/system-info")
def get_system_info_endpoint(
    current_user = Depends(get_current_user)
):
    """
    Returns current system hardware info
    and suggested resource budget.
    """
    info = get_system_info()
    budget = suggest_resource_budget(info["total_ram_mb"])
    return {
        "system": info,
        "suggested_budget": budget
    }

@router.get("/hardware-preference")
def get_hardware_preference(
    current_user = Depends(get_current_user)
):
    from backend.modules.hardware import (
        get_hardware_info, detect_device, list_available_backends
    )
    gpu = get_hardware_info()
    actual_device = detect_device()
    return {
        "hardware_mode":          gpu["hardware_mode"],
        "vector_embedding_device": actual_device,
        "whisper_device":          actual_device,
        "embedding_device":        gpu.get("embedding_device", actual_device),
        "available_backends":      list_available_backends(),
        "gpu_info":                gpu,
    }

@router.post("/hardware-preference")
def set_hardware_preference(
    body: HardwarePreferenceRequest,
    current_user = Depends(require_analyst)
):
    from backend.modules.hardware import (
        list_available_backends, get_hardware_info, invalidate_cache
    )
    mode = body.hardware_mode.lower().strip()

    # Accept any backend that's actually available on this machine,
    # or "auto" which is always valid.
    valid_modes = list_available_backends()  # e.g. ["auto", "cuda", "cpu"]
    if mode not in valid_modes:
        # Graceful fallback — accept the request but normalise to auto
        print(f"[QUEUE] Unknown hardware mode '{mode}' (available: {valid_modes}). Falling back to auto.")
        mode = "auto"

    os.environ["HARDWARE_MODE"] = mode

    # Invalidate the hardware detection cache so next poll re-probes
    invalidate_cache()

    try:
        if os.path.exists(env_path := ".env"):
            with open(env_path, "r") as f:
                content = f.read()
            if "HARDWARE_MODE=" in content:
                content = re.sub(r"HARDWARE_MODE=.*", f"HARDWARE_MODE={mode}", content)
            else:
                content += f"\nHARDWARE_MODE={mode}\n"
            with open(env_path, "w") as f:
                f.write(content)
    except Exception as e:
        print(f"Error updating .env: {e}")

    gpu = get_hardware_info()

    return {
        "status":          "success",
        "message":         f"Hardware compute preference updated to {mode.upper()}",
        "hardware_mode":   mode,
        "available_backends": valid_modes,
        "gpu_info":        gpu,
    }

@router.post("/estimate")
def estimate_time(
    body: dict,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Estimates ingestion time for one or
    more evidence files.
    Body: {evidence_ids: [...], cpu_throttle_percent: 70}
    """
    evidence_ids = body.get("evidence_ids", [])
    throttle = body.get("cpu_throttle_percent", 70)

    files = []
    for eid in evidence_ids:
        ev = db.query(
            models.Evidence
        ).filter(
            models.Evidence.id == eid
        ).first()
        if ev:
            files.append({
                "filename": ev.filename,
                "file_size_bytes": ev.file_size_bytes
            })

    if not files:
        raise HTTPException(
            status_code=404,
            detail="No evidence found")

    return estimate_queue_total(files, throttle)

@router.post("/add")
def add_to_queue(
    body: QueueJobRequest,
    current_user = Depends(require_investigator),
    db: Session = Depends(get_db)
):
    """
    Adds an evidence file to the ingestion queue.
    """
    # Check if already queued or remove old job
    existing = db.query(
        models.IngestionJob
    ).filter(
        models.IngestionJob.evidence_id == body.evidence_id
    ).first()
    if existing:
        if existing.status in ("Queued", "Running"):
            raise HTTPException(
                status_code=400,
                detail="Already in queue")
        else:
            db.delete(existing)
            db.commit()

    # Get queue position
    max_pos = db.query(
        models.IngestionJob
    ).filter(
        models.IngestionJob.status == "Queued"
    ).count()

    # Get time estimate
    ev = db.query(models.Evidence).filter(
        models.Evidence.id == body.evidence_id
    ).first()
    estimate = None
    if ev:
        est = estimate_ingestion_time(
            ev.filename,
            ev.file_size_bytes,
            body.cpu_throttle_percent
        )
        estimate = est["total_seconds"]

    job = models.IngestionJob(
        id=str(uuid.uuid4()),
        evidence_id=body.evidence_id,
        case_id=body.case_id,
        status="Queued",
        queue_position=max_pos,
        min_free_ram_mb=body.min_free_ram_mb,
        cpu_throttle_percent=body.cpu_throttle_percent,
        analysis_mode=body.analysis_mode,
        estimated_seconds=estimate,
        created_by=current_user.username
    )
    db.add(job)

    # Update evidence status to Queued
    if ev:
        ev.status = "Queued"
        ev.ingestion_job_id = job.id
        db.commit()

    # Ensure worker is running
    from backend.modules.job_worker import start_worker
    start_worker()

    return {
        "job_id": job.id,
        "queue_position": max_pos + 1,
        "estimated_seconds": estimate,
        "estimated_human": _fmt(estimate) if estimate else "Unknown"
    }

@router.post("/add-bulk")
def add_bulk_to_queue(
    body: BulkQueueRequest,
    current_user = Depends(require_investigator),
    db: Session = Depends(get_db)
):
    """Adds multiple files to queue."""
    results = []
    for job_req in body.jobs:
        try:
            # Reuse add logic
            result = add_to_queue(job_req, current_user, db)
            results.append({
                "evidence_id": job_req.evidence_id,
                "success": True,
                **result
            })
        except HTTPException as e:
            results.append({
                "evidence_id": job_req.evidence_id,
                "success": False,
                "error": e.detail
            })
    return {"results": results}

@router.get("")
def get_queue(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns all jobs in the queue."""
    jobs = db.query(
        models.IngestionJob
    ).filter(
        models.IngestionJob.status.in_(["Queued", "Running", "Paused"])
    ).order_by(
        models.IngestionJob.queue_position
    ).all()

    return [{
        "id": j.id,
        "evidence_id": j.evidence_id,
        "case_id": j.case_id,
        "status": j.status,
        "queue_position": j.queue_position,
        "progress_percent": j.progress_percent,
        "current_step": j.current_step,
        "estimated_seconds": int(((datetime.utcnow() - j.started_at).total_seconds() / j.progress_percent) * (100 - j.progress_percent)) if j.status == 'Running' and j.progress_percent and j.progress_percent > 0 and j.started_at else j.estimated_seconds,
        "started_at": str(j.started_at) if j.started_at else None,
        "cpu_throttle_percent": j.cpu_throttle_percent,
        "min_free_ram_mb": j.min_free_ram_mb
    } for j in jobs]

@router.get("/history")
def get_queue_history(
    limit: int = 20,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns completed/failed jobs."""
    jobs = db.query(
        models.IngestionJob
    ).filter(
        models.IngestionJob.status.in_(["Completed", "Failed", "Cancelled"])
    ).order_by(
        models.IngestionJob.completed_at.desc()
    ).limit(limit).all()

    return [{
        "id": j.id,
        "evidence_id": j.evidence_id,
        "status": j.status,
        "progress_percent": j.progress_percent,
        "current_step": j.current_step,
        "estimated_seconds": j.estimated_seconds,
        "started_at": str(j.started_at) if j.started_at else None,
        "completed_at": str(j.completed_at) if j.completed_at else None,
        "error_message": j.error_message
    } for j in jobs]

@router.get("/list")
def list_all_jobs(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns ALL jobs (active + history) in a single call.
    Used by the Queue Management page to power its unified table.
    Active jobs first (Running, Queued, Paused), then Completed/Failed/Cancelled
    ordered by most-recently-finished.
    """
    # Active jobs — all statuses except terminal ones
    active = db.query(models.IngestionJob).filter(
        models.IngestionJob.status.in_(["Queued", "Running", "Paused"])
    ).order_by(models.IngestionJob.queue_position).all()

    # History — most recent first, cap at 50 to keep payload small
    history = db.query(models.IngestionJob).filter(
        models.IngestionJob.status.in_(["Completed", "Failed", "Cancelled"])
    ).order_by(models.IngestionJob.completed_at.desc()).limit(50).all()

    def _row(j):
        # Try to pull filename from the linked evidence record for display
        ev = db.query(models.Evidence).filter(
            models.Evidence.id == j.evidence_id
        ).first()
        return {
            "id": j.id,
            "evidence_id": j.evidence_id,
            "case_id": j.case_id,
            "status": j.status,
            "queue_position": j.queue_position,
            "progress_percent": j.progress_percent,
            "progress": j.progress_percent,   # alias for frontend compat
            "current_step": j.current_step,
            "estimated_seconds": int(((datetime.utcnow() - j.started_at).total_seconds() / j.progress_percent) * (100 - j.progress_percent)) if j.status == 'Running' and j.progress_percent and j.progress_percent > 0 and j.started_at else j.estimated_seconds,
            "elapsed_seconds": int((datetime.utcnow() - j.started_at).total_seconds()) if j.status == 'Running' and j.started_at else j.elapsed_seconds,
            "started_at": str(j.started_at) if j.started_at else None,
            "completed_at": str(j.completed_at) if j.completed_at else None,
            "error_message": j.error_message,
            "created_by": j.created_by,
            "cpu_throttle_percent": j.cpu_throttle_percent,
            "min_free_ram_mb": j.min_free_ram_mb,
            "analysis_mode": j.analysis_mode or "normal",
            # Evidence display fields
            "filename": ev.filename if ev else None,
            "original_filename": ev.filename if ev else None,
            "chunk_count": ev.chunk_count if ev else None,
            "entity_count": ev.entity_count if ev else None,
        }

    return [_row(j) for j in active + history]

@router.delete("/{job_id}/cancel")
def cancel_job(
    job_id: str,
    current_user = Depends(require_investigator),
    db: Session = Depends(get_db)
):
    """Cancels a queued or running job."""
    job = db.query(
        models.IngestionJob
    ).filter(
        models.IngestionJob.id == job_id
    ).first()
    if not job:
        raise HTTPException(
            status_code=404,
            detail="Job not found")

    from backend.modules.job_worker import stop_job, _cleanup_job
    stop_job(job_id)
    _cleanup_job(job_id)

    job.status = "Cancelled"
    job.current_step = "Cancelled by user"
    job.completed_at = datetime.utcnow()
    # Reset evidence status
    ev = db.query(
        models.Evidence
    ).filter(
        models.Evidence.id == job.evidence_id
    ).first()
    if ev:
        ev.status = "Uploaded"
    db.commit()

    # Emit WebSocket cancellation broadcast
    try:
        from backend.main import _notify_case
        import asyncio
        _loop = asyncio.new_event_loop()
        _loop.run_until_complete(
            _notify_case(
                job.case_id,
                "INGESTION_FAILED",
                {
                    "evidence_id": job.evidence_id,
                    "message": "Ingestion cancelled by user",
                    "job_id": job.id,
                    "status": "Cancelled"
                },
            )
        )
        _loop.close()
    except Exception:
        pass

    return {"success": True}

@router.delete("/{job_id}")
def delete_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_analyst)
):
    """
    Permanently removes a completed, failed, or cancelled job from history.
    Running jobs cannot be deleted — stop or cancel them first.
    """
    job = db.query(
        models.IngestionJob
    ).filter(
        models.IngestionJob.id == job_id
    ).first()
    if not job:
        raise HTTPException(
            status_code=404,
            detail="Job not found")
    if job.status == "Running":
        raise HTTPException(
            status_code=400,
            detail="Cannot delete a running job — stop it first")
    db.delete(job)
    db.commit()
    return {"message": "Job removed from history"}

def _fmt(seconds) -> str:
    if not seconds:
        return "Unknown"
    if seconds < 60:
        return f"{seconds}s"
    elif seconds < 3600:
        return f"{seconds//60}m {seconds%60}s"
    else:
        return f"{h}h {m}m"


# ---------------------------------------------------------------------------
# Force-start (manual override — bypasses resource limits)
# ---------------------------------------------------------------------------

@router.post("/{job_id}/force-start")
def force_start_job_endpoint(
    job_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Immediately starts or resumes a Queued job, bypassing all
    CPU/RAM resource limits. Use when time-critical or when very
    little work remains. The job runs at full speed regardless of
    available system resources.
    """
    job = db.query(models.IngestionJob).filter(
        models.IngestionJob.id == job_id
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    from backend.modules.job_worker import force_start_job, start_worker
    force_start_job(job_id)
    start_worker()

    job.status = "Queued"
    job.current_step = "Force-starting..."
    db.commit()

    # Broadcast WebSocket state update so frontend reflects change immediately
    try:
        from backend.main import _notify_case
        import asyncio
        _loop = asyncio.new_event_loop()
        _loop.run_until_complete(
            _notify_case(
                job.case_id,
                "INGESTION_PROGRESS",
                {
                    "job_id": job.id,
                    "evidence_id": job.evidence_id,
                    "percent": 0,
                    "step": "Force-starting...",
                    "status": "Queued",
                },
            )
        )
        _loop.close()
    except Exception:
        pass

    return {
        "ok": True,
        "job_id": job_id,
        "message": "Force-start override activated — job starting immediately",
    }


# ---------------------------------------------------------------------------
# Stop (graceful stop of a running job)
# ---------------------------------------------------------------------------

@router.post("/{job_id}/stop")
def stop_job_endpoint(
    job_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Stops a running ingestion job immediately and reverts evidence status to Uploaded.
    """
    job = db.query(models.IngestionJob).filter(
        models.IngestionJob.id == job_id
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    from backend.modules.job_worker import stop_job
    stop_job(job_id)

    job.status = "Cancelled"
    job.current_step = "Stopped by user"
    job.completed_at = datetime.utcnow()

    ev = db.query(models.Evidence).filter(
        models.Evidence.id == job.evidence_id
    ).first()
    if ev:
        ev.status = "Uploaded"
    db.commit()

    # Emit WebSocket cancellation update immediately
    try:
        from backend.main import _notify_case
        import asyncio
        _loop = asyncio.new_event_loop()
        _loop.run_until_complete(
            _notify_case(
                job.case_id,
                "INGESTION_FAILED",
                {
                    "evidence_id": job.evidence_id,
                    "message": "Ingestion stopped by user",
                    "job_id": job.id,
                    "status": "Cancelled"
                },
            )
        )
        _loop.close()
    except Exception:
        pass

    return {
        "ok": True,
        "job_id": job_id,
        "message": "Job stopped and evidence reset to Uploaded",
    }


# ---------------------------------------------------------------------------
# Update settings (live resource spec edit for Queued or Running jobs)
# ---------------------------------------------------------------------------

@router.patch("/{job_id}/settings")
def update_job_settings(
    job_id: str,
    body: dict,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update CPU throttle % and/or min free RAM for a job at any time.
    For Running jobs the new limits take effect on the next batch check.
    Body: { cpu_throttle_percent?: int, min_free_ram_mb?: int }
    """
    job = db.query(models.IngestionJob).filter(
        models.IngestionJob.id == job_id
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status not in ("Queued", "Running"):
        raise HTTPException(
            status_code=400,
            detail=f"Job is {job.status} — can only edit Queued or Running jobs"
        )

    changed = []
    if "cpu_throttle_percent" in body:
        v = int(body["cpu_throttle_percent"])
        if not 10 <= v <= 100:
            raise HTTPException(
                status_code=400,
                detail="cpu_throttle_percent must be 10–100"
            )
        job.cpu_throttle_percent = v
        changed.append(f"CPU→{v}%")

    if "min_free_ram_mb" in body:
        v = int(body["min_free_ram_mb"])
        if v < 0:
            raise HTTPException(
                status_code=400,
                detail="min_free_ram_mb must be ≥ 0"
            )
        job.min_free_ram_mb = v
        changed.append(f"RAM floor→{v}MB")

    db.commit()
    return {
        "ok": True,
        "job_id": job_id,
        "changed": changed,
        "cpu_throttle_percent": job.cpu_throttle_percent,
        "min_free_ram_mb": job.min_free_ram_mb,
        "note": "Changes take effect on next batch boundary for running jobs",
    }

@router.get("/{case_id}/logs")
def get_ingestion_logs(
    case_id: str,
    lines: int = 200,
    current_user: models.User = Depends(get_current_user)
):
    from backend.dependencies import get_settings
    import os
    settings = get_settings()
    log_file = os.path.join(settings.cases_dir, case_id, "ingestion.log")
    
    if not os.path.exists(log_file):
        return {"logs": "No logs available yet."}
    
    try:
        with open(log_file, "r") as f:
            all_lines = f.readlines()
            return {"logs": "".join(all_lines[-lines:])}
    except Exception as e:
        return {"logs": f"Error reading logs: {str(e)}"}
