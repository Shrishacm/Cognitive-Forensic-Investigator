from backend.modules.text_parser import (
    extract_text, chunk_text)
from backend.modules.vector_store import store_chunks
from backend.modules.graph_builder import build_graph
from backend.modules.forensic_ingestion import (
    ingest_e01, ingest_raw,
    extract_file_content, compute_sha256)
from backend.modules.resource_governor import ResourceGovernor
from backend.database import SessionLocal
from backend import models
from backend.dependencies import get_settings
import json
import uuid
import os
import tempfile
from datetime import datetime
import logging

import threading
import queue
import asyncio

class WebSocketLogHandler(logging.Handler):
    def __init__(self, case_id):
        super().__init__()
        self.case_id = case_id
        self.log_queue = queue.Queue()
        self.worker_thread = threading.Thread(target=self._worker, daemon=True)
        self.worker_thread.start()

    def emit(self, record):
        try:
            msg = self.format(record)
            self.log_queue.put(msg)
        except Exception:
            self.handleError(record)
            
    def _worker(self):
        from backend.main import _notify_case
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        while True:
            try:
                # Batch logs every 0.1s or send immediately
                logs = []
                logs.append(self.log_queue.get())
                while not self.log_queue.empty() and len(logs) < 100:
                    logs.append(self.log_queue.get_nowait())
                
                payload = {"log": "\n".join(logs) + "\n"}
                loop.run_until_complete(_notify_case(self.case_id, "INGESTION_LOG", payload))
            except Exception:
                pass


def get_case_logger(case_id: str):
    logger = logging.getLogger(f"case_{case_id}")
    if logger.handlers:
        return logger
    logger.setLevel(logging.DEBUG)
    
    # Console handler
    ch = logging.StreamHandler()
    ch.setLevel(logging.DEBUG)
    
    # File handler
    log_dir = os.path.join(settings.cases_dir, case_id)
    os.makedirs(log_dir, exist_ok=True)
    fh = logging.FileHandler(os.path.join(log_dir, "ingestion.log"))
    fh.setLevel(logging.DEBUG)
    
    formatter = logging.Formatter('%(asctime)s - [%(levelname)s] - %(message)s')
    ch.setFormatter(formatter)
    fh.setFormatter(formatter)
    
    ws_handler = WebSocketLogHandler(case_id)
    ws_handler.setLevel(logging.DEBUG)
    ws_handler.setFormatter(formatter)
    
    logger.addHandler(ch)
    logger.addHandler(fh)
    logger.addHandler(ws_handler)
    return logger


settings = get_settings()

FORENSIC_EXTENSIONS = {'.e01', '.001', '.dd', '.raw', '.img'}
DOCUMENT_EXTENSIONS = {
    # Documents
    '.pdf', '.txt',
    # Office
    '.docx', '.doc',
    '.xlsx', '.xls',
    '.pptx', '.ppt',
    # Email
    '.eml', '.msg',
    # Audio
    '.mp3', '.wav', '.m4a',
    '.flac', '.ogg', '.aac',
    '.wma', '.aiff',
    # Video
    '.mp4', '.avi', '.mov',
    '.mkv', '.wmv', '.flv',
    '.webm', '.m4v',
    # Images (OCR)
    '.jpg', '.jpeg', '.png',
    '.tiff', '.tif', '.bmp',
    '.gif', '.webp'
}


def _is_forensic_image(filename: str) -> bool:
    ext = os.path.splitext(filename.lower())[1]
    return ext in FORENSIC_EXTENSIONS


# ---------------------------------------------------------------------------
# Router entry point — dispatches to document or forensic pipeline
# ---------------------------------------------------------------------------


def _update_job_progress(job_id: str, percent: int, step: str, eta: int = None, elapsed: int = 0):
    """Updates job progress in DB."""
    if not job_id:
        return
    db = SessionLocal()
    try:
        job = db.query(models.IngestionJob).filter(models.IngestionJob.id == job_id).first()
        if job:
            job.progress_percent = percent
            job.current_step = step
            if eta is not None:
                job.estimated_seconds = eta
            if elapsed:
                job.elapsed_seconds = elapsed
            db.commit()
    except Exception as e:
        print(f"[INGESTION] Progress update error: {e}")
    finally:
        db.close()


def run_ingestion_with_progress(
        evidence_id: str,
        case_id: str,
        file_path: str,
        filename: str,
        job_id: str = None,
        governor: ResourceGovernor = None,
        include_deleted: bool = False,
        progress_callback=None,
        stop_check=None):
    """
    Full ingestion pipeline with
    progress tracking and resource
    governance.
    progress_callback(case_id, job_id, evidence_id, percent, step)
    is called at each stage so the frontend gets live WS updates.
    stop_check() returns True when user has requested a stop.
    """
    if governor is None:
        governor = ResourceGovernor(force_override=True, cpu_throttle_percent=100)

    # Store stop_check on governor so check_and_throttle can use it
    governor._stop_check = stop_check

    import time
    start_time = time.time()

    def _progress(percent: int, step: str):
        eta_seconds = None
        elapsed = int(time.time() - start_time)
        if 0 < percent <= 100:
            if percent < 100:
                eta_seconds = int((elapsed / percent) * (100 - percent))
            
        _update_job_progress(job_id, percent, step, eta_seconds, elapsed)
            
        if progress_callback and job_id and case_id:
            try:
                progress_callback(case_id, job_id, evidence_id, percent, step, status="Running", eta_seconds=eta_seconds)
            except Exception:
                pass

    _progress(5, "Step 1/5: Reading file")

    db = SessionLocal()
    qdrant_path = (
        f"{settings.cases_dir}"
        f"/{case_id}/qdrant"
    )

    try:
        evidence = db.query(
            models.Evidence
        ).filter(
            models.Evidence.id == evidence_id
        ).first()
        if not evidence:
            return

        ext = os.path.splitext(
            filename.lower())[1]
        is_disk_image = ext in FORENSIC_EXTENSIONS

        # Fetch analysis_mode from the job record
        job_record = db.query(models.IngestionJob).filter(
            models.IngestionJob.id == job_id
        ).first() if job_id else None
        analysis_mode = (job_record.analysis_mode or "normal") if job_record else "normal"

        if is_disk_image:
            _run_forensic_with_progress(
                evidence, case_id,
                file_path, filename,
                job_id, governor,
                include_deleted,
                qdrant_path, db,
                progress_callback=_progress)
        else:
            _run_document_with_progress(
                evidence, case_id,
                file_path, filename,
                job_id, governor,
                qdrant_path, db,
                progress_callback=_progress,
                analysis_mode=analysis_mode)

    except (Exception, BaseException) as e:
        print(f"[INGESTION] FAILED: {e}")
        import traceback
        traceback.print_exc()
        _update_job_progress(
            job_id, 0, f"Failed: {e}")
        try:
            evidence = db.query(
                models.Evidence
            ).filter(
                models.Evidence.id ==
                    evidence_id
            ).first()
            if evidence:
                evidence.status = "Failed"
                evidence.error_message = (
                    str(e))
                db.commit()
        except:
            pass

        # Mark job as failed
        if job_id:
            db2 = SessionLocal()
            try:
                j = db2.query(
                    models.IngestionJob
                ).filter(
                    models.IngestionJob.id
                        == job_id
                ).first()
                if j:
                    j.status = "Failed"
                    j.error_message = str(e)
                    j.completed_at = (
                        datetime.utcnow())
                    db2.commit()
            finally:
                db2.close()
    finally:
        db.close()



# ---------------------------------------------------------------------------
# Document pipeline
# (PDF / TXT / Office / Audio / Video / Email / Image OCR)
# ---------------------------------------------------------------------------

# Fast path for types handled by text_parser.extract_text()
_FAST_TEXT_EXTENSIONS = {'.pdf', '.txt'}



def _run_document_with_progress(
        evidence, case_id, file_path,
        filename, job_id, governor,
        qdrant_path, db,
        progress_callback=None,
        analysis_mode="normal"):

    """
    Ingestion pipeline for all non-disk-image
    files: PDF, TXT, Office docs, email, audio,
    video, and images.

    analysis_mode controls the speed/accuracy tradeoff:
      fastest  — big chunks, minimal NER, skip watchlist
      normal   — balanced (default)
      accurate — small chunks, full NER on all chunks
    """
    # ── Mode-specific pipeline parameters ───────────────────────────────────
    MODE_PARAMS = {
        "fastest":  {"chunk_size": 3500,  "overlap": 150, "ner_cap": 50,   "embed_batch": 128, "skip_watchlist": True},
        "normal":   {"chunk_size": 1500,  "overlap": 150, "ner_cap": 200,  "embed_batch": 64,  "skip_watchlist": False},
        "accurate": {"chunk_size": 800,   "overlap": 100, "ner_cap": None, "embed_batch": 32,  "skip_watchlist": False},
    }
    params = MODE_PARAMS.get(analysis_mode, MODE_PARAMS["normal"])
    import tempfile
    import shutil
    db = SessionLocal()
    qdrant_path = (
        f"{settings.cases_dir}/{case_id}/qdrant")

    evidence_id = evidence.id
    logger = get_case_logger(case_id)

    def _progress(percent: int, step: str):
        _update_job_progress(job_id, percent, step)
        if progress_callback and job_id and case_id:
            try:
                progress_callback(case_id, job_id, evidence_id, percent, step)
            except Exception:
                pass

    try:
        
        ext = os.path.splitext(
            filename.lower())[1]
        logger.info(f"Starting ingestion for {ext.upper()} file: {filename}")
        print(
            f"[INGESTION] {ext.upper()} "
            f"file: {filename}")

        if ext in _FAST_TEXT_EXTENSIONS:
            # PDF and plain text — fast path
            _progress(10, 'Step 1/5: Extracting text')
            governor.check_and_throttle()
            text = extract_text(file_path)
            extraction_type = (
                'pdf' if ext == '.pdf'
                else 'text')
        else:
            # Multimedia: read as bytes and
            # route through extract_text_from_bytes
            from backend.modules.forensic_ingestion \
                import extract_text_from_bytes
            with open(file_path, 'rb') as f:
                data = f.read()
            temp_dir = tempfile.mkdtemp(
                prefix="cfi_media_")
            try:
                text, extraction_type = \
                    extract_text_from_bytes(
                        data, filename,
                        temp_dir)
            finally:
                try:
                    shutil.rmtree(
                        temp_dir,
                        ignore_errors=True)
                except Exception:
                    pass

        if not text or not text.strip():
            # Audio with no speech, images
            # with no readable text, etc.
            # Mark as Indexed with 0 chunks
            # rather than Failed.
            print(
                f"[INGESTION] No text from "
                f"{filename} "
                f"(type: {extraction_type})")
            evidence.status = "Indexed"
            evidence.chunk_count = 0
            evidence.entity_count = 0
            db.commit()
            return

        mode_label = analysis_mode.upper()
        _progress(25, f'Step 2/5: Chunking text [{mode_label} mode]')
        governor.check_and_throttle()
        chunks = chunk_text(text,
                            chunk_size=params["chunk_size"],
                            overlap=params["overlap"])

        _progress(40, f"Step 3-4/5: Parallel Embedding & Graph Building ({len(chunks)} chunks, {mode_label} mode)")
        logger.info(f"[{mode_label}] {len(chunks)} chunks. embed_batch={params['embed_batch']}, ner_cap={params['ner_cap']}")
        
        def run_embeddings():
            logger.debug(f"VectorStore: Embedding {len(chunks)} chunks, batch_size={params['embed_batch']}")
            count = store_chunks(
                chunks=chunks,
                source_filename=filename,
                evidence_id=evidence.id,
                case_id=case_id,
                qdrant_path=qdrant_path,
                batch_size=params["embed_batch"]
            )
            _progress(70, f"Step 3/5: Embedding done ({count} chunks stored)")
            logger.info(f"Finished embedding all {count} chunks.")
            return count

        def run_graph():
            logger.info("GraphBuilder: Starting entity extraction via SpaCy.")
            governor.check_and_throttle()
            # Apply NER cap from analysis_mode
            ner_cap = params["ner_cap"]
            if ner_cap and len(chunks) > ner_cap:
                step = max(1, len(chunks) // ner_cap)
                ner_chunks = chunks[::step][:ner_cap]
                logger.info(f"NER cap: sampling {len(ner_chunks)}/{len(chunks)} chunks ({analysis_mode} mode)")
            else:
                ner_chunks = chunks
            res = build_graph(
                chunks=ner_chunks,
                source_filename=filename,
                evidence_id=evidence.id,
                case_id=case_id,
                cases_dir=settings.cases_dir,
                governor=governor
            )
            logger.info("GraphBuilder: Finished entity extraction.")
            return res

        import concurrent.futures
        executor = concurrent.futures.ThreadPoolExecutor(max_workers=2)
        future_embed = executor.submit(run_embeddings)
        future_graph = executor.submit(run_graph)
        
        done, not_done = concurrent.futures.wait(
            [future_embed, future_graph],
            return_when=concurrent.futures.FIRST_EXCEPTION
        )
        for future in done:
            if future.exception():
                executor.shutdown(wait=False, cancel_futures=True)
                raise future.exception()
                
        chunk_count = future_embed.result()
        entity_counts, extracted_entities = future_graph.result()
        executor.shutdown(wait=False)

        _progress(90, 'Step 5/5: Saving entities')
        governor.check_and_throttle()
        _save_entities_to_db(
            db, extracted_entities, case_id,
            evidence.id, filename)

        total_entities = sum(
            entity_counts.values())

        # ── Watchlist scanning (skipped in fastest mode) ────────────────────
        if not params["skip_watchlist"]:
            try:
                _wl_db = SessionLocal()
                wl_keywords = _wl_db.query(
                    models.WatchlistKeyword
                ).filter(
                    models.WatchlistKeyword.case_id == case_id,
                    models.WatchlistKeyword.is_active == True
                ).all()

                if wl_keywords:
                    matched_any = False
                    for chunk in chunks:
                        chunk_lower = chunk.lower()
                        for kw in wl_keywords:
                            if kw.keyword.lower() in chunk_lower:
                                kw.hit_count += 1
                                matched_any = True
                    if matched_any:
                        _wl_db.commit()
                        print(
                            f"[INGESTION] Watchlist: "
                            f"scanned {len(wl_keywords)} "
                            f"keywords"
                        )
                _wl_db.close()
            except Exception as wl_err:
                print(f"[INGESTION] Watchlist scan error: {wl_err}")

        # ── Credential scanning ──────────────────────────────────────────
        try:
            from backend.modules.credential_scanner import scan_chunks as scan_for_creds
            cred_findings = scan_for_creds(chunks, filename)
            if cred_findings:
                cred_db = SessionLocal()
                cred_count = 0
                try:
                    for finding in cred_findings:
                        import uuid as _uuid
                        cred_db.add(models.CredentialFinding(
                            id=str(_uuid.uuid4()),
                            case_id=case_id,
                            evidence_id=evidence_id,
                            credential_type=finding["credential_type"],
                            matched_value=finding["matched_value"],
                            context=finding["context"],
                            source_file=finding["source_file"] or filename,
                            severity=finding["severity"],
                        ))
                        cred_count += 1
                    cred_db.commit()
                    print(f"[INGESTION] Found {cred_count} credential(s)")
                finally:
                    cred_db.close()
        except Exception as cred_err:
            print(f"[INGESTION] Credential scan error: {cred_err}")

        evidence = db.query(models.Evidence).filter(models.Evidence.id == evidence_id).first()
        if evidence:
            evidence.status = "Indexed"
            evidence.chunk_count = chunk_count
            evidence.entity_count = total_entities
            db.commit()

        _create_audit_log(
            db, case_id, "FILE_INGESTED",
            {
                "filename": filename,
                "type": extraction_type,
                "chunk_count": chunk_count,
                "entity_count": total_entities
            }
        )
        db.commit()
        
        _progress(100, "Complete")
        if job_id:
            db2 = SessionLocal()
            try:
                j = db2.query(models.IngestionJob).filter(models.IngestionJob.id == job_id).first()
                if j:
                    j.status = "Completed"
                    j.progress_percent = 100
                    j.completed_at = datetime.utcnow()
                    if j.started_at:
                        j.elapsed_seconds = int((j.completed_at - j.started_at).total_seconds())
                    j.current_step = f"Complete — {chunk_count} chunks, {total_entities} entities"
                    db2.commit()
            finally:
                db2.close()

        print(f"[INGESTION] Done: {chunk_count} chunks, {total_entities} entities ({extraction_type})")

    except Exception as e:
        print(f"[INGESTION] FAILED: {e}")
        import traceback
        traceback.print_exc()
        try:
            evidence = db.query(
                models.Evidence
            ).filter(
                models.Evidence.id ==
                evidence_id
            ).first()
            if evidence:
                evidence.status = "Failed"
                evidence.error_message = str(e)
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Forensic pipeline (.E01 / .001 / .dd / .raw / .img)
# ---------------------------------------------------------------------------


def _run_forensic_with_progress(evidence, case_id, file_path,
                           filename, job_id, governor,
                           include_deleted, qdrant_path, db):

    """
    Full forensic pipeline for disk images.

    Steps:
      1. Verify SHA-256 of disk image
      2. Mount read-only via pyewf/pytsk3
      3. Walk filesystem, extract all files
      4. For each file: extract text + timestamps
      5. Store artifacts in ForensicArtifact table
      6. Feed all extracted text into Qdrant + graph
      7. Update Evidence record
    """
    temp_dir = None
    logger = get_case_logger(case_id)
    try:

        logger.info(f"Starting Forensic Pipeline for image: {filename}")
        print(f"[FORENSIC] Starting: {filename}")

        # Step 1: Verify image hash
        logger.info("Verifying image SHA-256 hash...")
        print(f"[FORENSIC] Verifying image SHA-256...")
        image_hash = compute_sha256(file_path)
        evidence.sha256_hash = image_hash
        db.commit()
        logger.info(f"SHA-256 computed: {image_hash}")
        print(f"[FORENSIC] SHA-256: {image_hash[:16]}...")

        # Determine image type
        ext = os.path.splitext(filename.lower())[1]

        # Step 2: Create temp directory for intermediate files
        temp_dir = tempfile.mkdtemp(prefix="cfi_forensic_")

        _update_job_progress(job_id, 5, "Step 2: Mounting image")
        logger.info(f"Mounting disk image using pytsk3...")
        print(f"[FORENSIC] Mounting image...")
        try:
            if ext == '.e01':
                logger.debug("Image type detected as .E01")
                file_generator = ingest_e01(
                    file_path, temp_dir,
                    include_deleted=include_deleted)
            else:
                logger.debug(f"Image type detected as raw ({ext})")
                file_generator = ingest_raw(
                    file_path, temp_dir,
                    include_deleted=include_deleted)

            artifact_count = 0
            total_chunks = 0
            all_chunk_texts = []

            # Set up directory to save raw extracted files
            extracted_base_dir = os.path.join(
                settings.cases_dir,
                case_id,
                "evidence",
                evidence.id,
                "extracted"
            )
            os.makedirs(extracted_base_dir, exist_ok=True)
            print(f"[FORENSIC] Saving extracted files to: {extracted_base_dir}")

            _update_job_progress(job_id, 20, "Step 3: Walking filesystem")
            print(f"[FORENSIC] Walking filesystem...")

            # Step 3 & 4: Walk and extract
            for file_info in file_generator:
                try:
                    enriched = extract_file_content(
                        file_info, temp_dir,
                        extracted_base_dir)

                    if not enriched.get("extracted_text"):
                        continue

                    # Step 5: Save to ForensicArtifact
                    artifact = models.ForensicArtifact(
                        id=str(uuid.uuid4()),
                        evidence_id=evidence.id,
                        case_id=case_id,
                        internal_path=enriched["internal_path"],
                        filename=enriched["filename"],
                        file_extension=os.path.splitext(
                            enriched["filename"].lower())[1],
                        file_size_bytes=enriched["size"],
                        sha256_hash=enriched["sha256_hash"],
                        modified_at=enriched["modified"],
                        accessed_at=enriched["accessed"],
                        created_at_ts=enriched["created"],
                        born_at=enriched["born"],
                        extracted_text=enriched[
                            "extracted_text"][:10000],
                        extraction_type=enriched[
                            "extraction_type"],
                        exif_data="{}",
                        shannon_entropy=enriched.get(
                            "shannon_entropy"),
                        is_deleted=enriched.get(
                            "is_deleted", False),
                        gps_latitude=enriched.get(
                            "gps_latitude"),
                        gps_longitude=enriched.get(
                            "gps_longitude"),
                        stored_file_path=enriched.get(
                            "stored_file_path"),
                        stored_file_size=enriched.get(
                            "stored_file_size", 0),
                        is_viewable=enriched.get(
                            "is_viewable", False)
                    )
                    db.add(artifact)
                    artifact_count += 1

                    # Tag text with internal path for RAG context
                    tagged_text = (
                        f"[File: {enriched['internal_path']}"
                        f" | Modified: {enriched['modified']}]\n"
                        f"{enriched['extracted_text']}"
                    )
                    all_chunk_texts.append(tagged_text)

                    # Commit every 50 artifacts to avoid
                    # large in-memory transactions
                    if artifact_count % 50 == 0:
                        db.commit()
                        # Simulate a rough progress for extraction between 20-60%
                        # It is hard to know total file count upfront, but we update progress.
                        prog = min(60, 20 + int(artifact_count/100))
                        _update_job_progress(job_id, prog, f"Step 3: Extracting files ({artifact_count} so far)")
                        governor.check_and_throttle()
                        print(f"[FORENSIC] {artifact_count} artifacts processed")

                except Exception as e:
                    print(f"[FORENSIC] File error: {e}")
                    continue

            db.commit()
            print(f"[FORENSIC] {artifact_count} artifacts extracted")

            # Run anomaly detection on all artifacts
            _update_job_progress(job_id, 60, "Step 4: Anomaly detection")
            governor.check_and_throttle()
            print(f"[FORENSIC] Running anomaly detection...")
            from backend.modules.anomaly_detector import (
                run_anomaly_detection)

            # Build list of artifact dicts for detector
            artifact_dicts = []
            saved_artifacts = db.query(
                models.ForensicArtifact
            ).filter(
                models.ForensicArtifact.evidence_id == evidence.id
            ).all()

            for sa in saved_artifacts:
                artifact_dicts.append({
                    "id": sa.id,
                    "modified_at": sa.modified_at,
                    "accessed_at": sa.accessed_at,
                    "created_at_ts": sa.created_at_ts,
                    "born_at": sa.born_at
                })

            anomaly_results = run_anomaly_detection(
                artifact_dicts)

            # Update artifacts with anomaly flags
            anomaly_count = 0
            for result in anomaly_results:
                if result["is_anomaly"]:
                    anomaly_count += 1
                    artifact_obj = db.query(
                        models.ForensicArtifact
                    ).filter(
                        models.ForensicArtifact.id
                            == result["id"]
                    ).first()
                    if artifact_obj:
                        artifact_obj.is_anomaly = True
                        artifact_obj.anomaly_reasons = (
                            json.dumps(result["reasons"]))
            db.commit()
            print(f"[FORENSIC] Anomaly detection: "
                  f"{anomaly_count} anomalies found")

            _update_job_progress(job_id, 70, "Step 5-6: Parallel Vector & Graph Build")
            governor.check_and_throttle()
            logger.info("Building vector index and entity graph concurrently...")
            print(f"[FORENSIC] Building vector index & entity graph concurrently...")
            # Limit to 500 files for memory safety on M1 8GB
            combined_text = "\n\n---\n\n".join(
                all_chunk_texts[:500])
            chunks = chunk_text(combined_text)
            logger.info(f"Chunked forensic evidence into {len(chunks)} chunks.")
            
            def run_embeddings_forensic():
                count = 0
                i = 0
                while i < len(chunks):
                    BATCH = governor.get_optimal_batch_size(base_batch=500) if governor else 500
                    batch = chunks[i:i+BATCH]
                    logger.debug(f"VectorStore: Sending batch {i//BATCH + 1} ({len(batch)} chunks) to embedder")
                    count += store_chunks(
                        chunks=batch,
                        source_filename=filename,
                        evidence_id=evidence.id,
                        case_id=case_id,
                        qdrant_path=qdrant_path
                    )
                    i += len(batch)
                    progress = 70 + int((i / len(chunks)) * 15)
                    _update_job_progress(job_id, progress, f"Step 5: Building vector index ({i}/{len(chunks)} chunks)")
                    logger.info(f"Embedded batch. Total chunks stored: {count}/{len(chunks)}")
                    if governor:
                        governor.check_and_throttle()
                logger.info("Finished forensic embedding process.")
                return count

            def run_graph_forensic():
                logger.info("GraphBuilder: Starting entity extraction via SpaCy.")
                governor.check_and_throttle()
                ner_chunks = chunks if len(chunks) <= 10000 else chunks[::3]
                if len(ner_chunks) != len(chunks):
                    logger.info(f"Large file: subsampling {len(ner_chunks)}/{len(chunks)} chunks for NER")
                res = build_graph(
                    chunks=ner_chunks,
                    source_filename=filename,
                    evidence_id=evidence.id,
                    case_id=case_id,
                    cases_dir=settings.cases_dir,
                    governor=governor
                )
                logger.info("GraphBuilder: Finished entity extraction.")
                return res

            import concurrent.futures
            executor = concurrent.futures.ThreadPoolExecutor(max_workers=2)
            future_embed = executor.submit(run_embeddings_forensic)
            future_graph = executor.submit(run_graph_forensic)
            
            done, not_done = concurrent.futures.wait(
                [future_embed, future_graph],
                return_when=concurrent.futures.FIRST_EXCEPTION
            )
            for future in done:
                if future.exception():
                    executor.shutdown(wait=False, cancel_futures=True)
                    raise future.exception()
            
            total_chunks = future_embed.result()
            entity_counts, extracted_entities = future_graph.result()
            executor.shutdown(wait=False)

            # Save entities to DB
            _update_job_progress(job_id, 90, 'Step 5/5: Saving entities')
            governor.check_and_throttle()
            _save_entities_to_db(
                db, extracted_entities, case_id, evidence.id, filename)

            total_entities = sum(entity_counts.values())

            # ── Watchlist scanning on artifacts ──────────────
            try:
                _wdb = SessionLocal()
                wl_keywords = _wdb.query(
                    models.WatchlistKeyword
                ).filter(
                    models.WatchlistKeyword.case_id == case_id,
                    models.WatchlistKeyword.is_active == True
                ).all()

                if wl_keywords:
                    flagged_by_watchlist = 0
                    # Re-fetch saved artifacts fresh from this session
                    fresh_artifacts = _wdb.query(
                        models.ForensicArtifact
                    ).filter(
                        models.ForensicArtifact.evidence_id == evidence.id
                    ).all()

                    for sa in fresh_artifacts:
                        if not sa.extracted_text:
                            continue
                        text_lower = sa.extracted_text.lower()
                        for kw in wl_keywords:
                            if kw.keyword.lower() in text_lower:
                                sa.is_flagged = True
                                kw.hit_count += 1
                                flagged_by_watchlist += 1
                                break

                    _wdb.commit()
                    print(
                        f"[FORENSIC] Watchlist: "
                        f"{flagged_by_watchlist} artifacts flagged"
                    )
                _wdb.close()
            except Exception as wl_err:
                print(f"[FORENSIC] Watchlist scan error: {wl_err}")

            # ── Credential scanning ──────────────────────────────────────
            try:
                from backend.modules.credential_scanner import scan_chunks as scan_for_creds
                cred_findings = scan_for_creds(chunks, filename)
                if cred_findings:
                    cred_db2 = SessionLocal()
                    cred_count2 = 0
                    try:
                        for finding in cred_findings:
                            import uuid as _uuid2
                            cred_db2.add(models.CredentialFinding(
                                id=str(_uuid2.uuid4()),
                                case_id=case_id,
                                evidence_id=evidence.id,
                                credential_type=finding["credential_type"],
                                matched_value=finding["matched_value"],
                                context=finding["context"],
                                source_file=finding["source_file"] or filename,
                                severity=finding["severity"],
                            ))
                            cred_count2 += 1
                        cred_db2.commit()
                        print(f"[FORENSIC] Found {cred_count2} credential(s)")
                    finally:
                        cred_db2.close()
            except Exception as cred_err2:
                print(f"[FORENSIC] Credential scan error: {cred_err2}")

            # Step 7: Update Evidence record
            evidence = db.query(models.Evidence).filter(models.Evidence.id == evidence_id).first()
            if evidence:
                evidence.status = "Indexed"
                evidence.chunk_count = total_chunks
                evidence.entity_count = total_entities
                db.commit()

            # Audit log
            _create_audit_log(
                db, case_id, "FILE_INGESTED",
                {
                    "filename": filename,
                    "type": "forensic_image",
                    "image_hash": image_hash,
                    "artifacts_extracted": artifact_count,
                    "chunk_count": total_chunks,
                    "entity_count": total_entities
                }
            )
            db.commit()

            
            _update_job_progress(job_id, 100, "Complete")
            if job_id:
                db2 = SessionLocal()
                try:
                    j = db2.query(models.IngestionJob).filter(models.IngestionJob.id == job_id).first()
                    if j:
                        j.status = "Completed"
                        j.progress_percent = 100
                        j.completed_at = datetime.utcnow()
                        if j.started_at:
                            j.elapsed_seconds = int((j.completed_at - j.started_at).total_seconds())
                        j.current_step = f"Complete — {artifact_count} artifacts"
                        db2.commit()
                finally:
                    db2.close()

            print(f"[FORENSIC] Complete: {artifact_count} artifacts, {total_chunks} chunks, {total_entities} entities")

        except Exception as mount_error:
            print(f"[FORENSIC] Mount failed: {mount_error}")
            import traceback
            traceback.print_exc()
            evidence.status = "Failed"
            evidence.error_message = (
                f"Mount failed: {mount_error}")
            db.commit()

    except Exception as e:
        print(f"[FORENSIC] PIPELINE FAILED: {e}")
        import traceback
        traceback.print_exc()
        try:
            evidence = db.query(models.Evidence).filter(
                models.Evidence.id == evidence_id
            ).first()
            if evidence:
                evidence.status = "Failed"
                evidence.error_message = str(e)
                db.commit()
        except Exception:
            pass
    finally:
        # Always clean up temp directory
        if temp_dir:
            import shutil
            shutil.rmtree(temp_dir, ignore_errors=True)
        db.close()


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def _save_entities_to_db(db, extracted_entities, case_id,
                         evidence_id, filename):
    """Saves pre-extracted entities to DB using bulk operations."""
    all_entities = {}
    for ents in extracted_entities:
        for etype, names in {
            "Person": ents["persons"],
            "Location": ents["locations"],
            "Organization": ents["organizations"],
            "IP": ents["ips"]
        }.items():
            for name in names:
                key = f"{etype}:{name}"
                if key not in all_entities:
                    all_entities[key] = {
                        "name": name,
                        "type": etype,
                        "count": 0
                    }
                all_entities[key]["count"] += 1

    if not all_entities:
        return

    # Bulk fetch existing entities for this case
    existing_ents = db.query(models.Entity).filter(
        models.Entity.case_id == case_id
    ).all()
    
    existing_map = {f"{e.entity_type}:{e.name}": e for e in existing_ents}
    
    new_entities = []
    
    for key, ent_data in all_entities.items():
        if key in existing_map:
            existing_map[key].frequency += ent_data["count"]
        else:
            new_entities.append(models.Entity(
                id=str(uuid.uuid4()),
                case_id=case_id,
                evidence_id=evidence_id,
                name=ent_data["name"],
                entity_type=ent_data["type"],
                frequency=ent_data["count"],
                aliases=json.dumps([])
            ))

    if new_entities:
        db.bulk_save_objects(new_entities)


def _create_audit_log(db, case_id, action_type, details):
    """Inserts an AuditLog row."""
    db.add(models.AuditLog(
        id=str(uuid.uuid4()),
        case_id=case_id,
        action_type=action_type,
        performed_by="system",
        details=json.dumps(details)
    ))
