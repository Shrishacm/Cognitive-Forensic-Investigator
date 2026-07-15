import re

with open("backend/ingestion.py", "r") as f:
    code = f.read()

# 1. Add ResourceGovernor import
if "ResourceGovernor" not in code:
    code = code.replace("from backend.database import SessionLocal", 
                        "from backend.modules.resource_governor import ResourceGovernor\nfrom backend.database import SessionLocal")

# 2. Add _update_job_progress
update_progress_code = """
def _update_job_progress(job_id: str, percent: int, step: str):
    \"\"\"Updates job progress in DB.\"\"\"
    if not job_id:
        return
    db = SessionLocal()
    try:
        job = db.query(models.IngestionJob).filter(models.IngestionJob.id == job_id).first()
        if job:
            job.progress_percent = percent
            job.current_step = step
            db.commit()
    except Exception as e:
        print(f"[INGESTION] Progress update error: {e}")
    finally:
        db.close()
"""

# Replace run_ingestion
new_run_ingestion = """
def run_ingestion_with_progress(
        evidence_id: str,
        case_id: str,
        file_path: str,
        filename: str,
        job_id: str = None,
        governor: ResourceGovernor = None,
        include_deleted: bool = False):
    \"\"\"
    Full ingestion pipeline with
    progress tracking and resource
    governance.
    \"\"\"
    if governor is None:
        governor = ResourceGovernor()

    _update_job_progress(
        job_id, 5,
        "Step 1/5: Reading file")

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

        if is_disk_image:
            _run_forensic_with_progress(
                evidence, case_id,
                file_path, filename,
                job_id, governor,
                include_deleted,
                qdrant_path, db)
        else:
            _run_document_with_progress(
                evidence, case_id,
                file_path, filename,
                job_id, governor,
                qdrant_path, db)

    except Exception as e:
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
"""

# Regex replacement for run_ingestion
code = re.sub(r'def run_ingestion\(evidence_id: str,.*?else:\n\s*run_document_ingestion\(\n\s*evidence_id, case_id, file_path, filename\)', 
              update_progress_code + "\n" + new_run_ingestion, 
              code, flags=re.DOTALL)

# 3. Replace run_document_ingestion definition
new_doc_ingestion = """
def _run_document_with_progress(
        evidence, case_id, file_path,
        filename, job_id, governor,
        qdrant_path, db):
"""
code = code.replace("def run_document_ingestion(evidence_id: str,\n                           case_id: str,\n                           file_path: str,\n                           filename: str):", new_doc_ingestion)

# 4. In _run_document_with_progress, add governor checks and progress updates
# Replace `text = extract_text(file_path)`
code = code.replace("text = extract_text(file_path)", "_update_job_progress(job_id, 10, 'Step 1/5: Extracting text')\n            governor.check_and_throttle()\n            text = extract_text(file_path)")

# Replace `chunks = chunk_text(text)`
code = code.replace("chunks = chunk_text(text)", "_update_job_progress(job_id, 25, 'Step 2/5: Chunking text')\n        governor.check_and_throttle()\n        chunks = chunk_text(text)")

# Replace `chunk_count = store_chunks(...)`
batch_store_code = """
        _update_job_progress(job_id, 40, f"Step 3/5: Embedding {len(chunks)} chunks")
        BATCH = 20
        chunk_count = 0
        for i in range(0, len(chunks), BATCH):
            batch = chunks[i:i+BATCH]
            chunk_count += store_chunks(
                chunks=batch,
                source_filename=filename,
                evidence_id=evidence.id,
                case_id=case_id,
                qdrant_path=qdrant_path
            )
            progress = 40 + int((i / len(chunks)) * 30)
            _update_job_progress(job_id, progress, f"Step 3/5: Embedding ({i+len(batch)}/{len(chunks)} chunks)")
            governor.check_and_throttle()
"""
code = re.sub(r'chunk_count = store_chunks\(\n\s*chunks=chunks,\n\s*source_filename=filename,\n\s*evidence_id=evidence_id,\n\s*case_id=case_id,\n\s*qdrant_path=qdrant_path\n\s*\)', batch_store_code, code)

# Replace `entity_counts = build_graph(...)`
code = code.replace("entity_counts = build_graph(", "_update_job_progress(job_id, 75, 'Step 4/5: Building entity graph')\n        governor.check_and_throttle()\n        entity_counts = build_graph(")

# Replace `_save_entities_to_db(...)`
code = code.replace("_save_entities_to_db(", "_update_job_progress(job_id, 90, 'Step 5/5: Saving entities')\n        governor.check_and_throttle()\n        _save_entities_to_db(")

# Change evidence_id to evidence.id where needed inside the function
code = code.replace("evidence_id=evidence_id,", "evidence_id=evidence.id,")
code = code.replace("evidence_id, filename)", "evidence.id, filename)")

# Add completion update at the end of the try block for doc ingestion
completion_code = """
        _update_job_progress(job_id, 100, "Complete")
        if job_id:
            db2 = SessionLocal()
            try:
                j = db2.query(models.IngestionJob).filter(models.IngestionJob.id == job_id).first()
                if j:
                    j.status = "Completed"
                    j.progress_percent = 100
                    j.completed_at = datetime.utcnow()
                    j.current_step = f"Complete — {chunk_count} chunks, {total_entities} entities"
                    db2.commit()
            finally:
                db2.close()
"""
code = code.replace('print(\n            f"[INGESTION] Done: "\n            f"{chunk_count} chunks, "\n            f"{total_entities} entities "\n            f"({extraction_type})")', completion_code + '\n        print(f"[INGESTION] Done: {chunk_count} chunks, {total_entities} entities ({extraction_type})")')

# Remove duplicate try/catch Evidence querying in _run_document_with_progress
code = re.sub(r'evidence = db\.query\(\n\s*models\.Evidence\n\s*\)\.filter\(\n\s*models\.Evidence\.id == evidence_id\n\s*\)\.first\(\)\n\s*if not evidence:\n\s*return\n\n\s*evidence\.status = "Processing"\n\s*db\.commit\(\)\n', '', code)


# 5. Replace run_forensic_ingestion definition
new_for_ingestion = """
def _run_forensic_with_progress(evidence, case_id, file_path,
                           filename, job_id, governor,
                           include_deleted, qdrant_path, db):
"""
code = code.replace("def run_forensic_ingestion(evidence_id: str,\n                           case_id: str,\n                           file_path: str,\n                           filename: str,\n                           include_deleted: bool = False):", new_for_ingestion)

# Remove the duplicated DB and qdrant initialization inside _run_forensic_with_progress
code = re.sub(r'db = SessionLocal\(\)\n\s*qdrant_path = f"\{settings.cases_dir\}/\{case_id\}/qdrant"\n\s*temp_dir = None\n\n\s*try:\n\s*evidence = db\.query\(models\.Evidence\)\.filter\(\n\s*models\.Evidence\.id == evidence_id\n\s*\)\.first\(\)\n\s*if not evidence:\n\s*return\n\n\s*evidence\.status = "Processing"\n\s*db\.commit\(\)\n', 'temp_dir = None\n    try:\n', code)


# 5% mounting
code = code.replace('print(f"[FORENSIC] Mounting image...")', '_update_job_progress(job_id, 5, "Step 2: Mounting image")\n        print(f"[FORENSIC] Mounting image...")')

# 20% walking
code = code.replace('print(f"[FORENSIC] Walking filesystem...")', '_update_job_progress(job_id, 20, "Step 3: Walking filesystem")\n            print(f"[FORENSIC] Walking filesystem...")')

# Replace the artifact chunk loop
old_artifact_commit = """                    if artifact_count % 50 == 0:
                        db.commit()
                        print(f"[FORENSIC] "
                              f"{artifact_count} artifacts processed")"""
new_artifact_commit = """                    if artifact_count % 50 == 0:
                        db.commit()
                        # Simulate a rough progress for extraction between 20-60%
                        # It is hard to know total file count upfront, but we update progress.
                        prog = min(60, 20 + int(artifact_count/100))
                        _update_job_progress(job_id, prog, f"Step 3: Extracting files ({artifact_count} so far)")
                        governor.check_and_throttle()
                        print(f"[FORENSIC] {artifact_count} artifacts processed")"""
code = code.replace(old_artifact_commit, new_artifact_commit)

# 60% anomaly detection
code = code.replace('print(f"[FORENSIC] Running anomaly "\n                  f"detection...")', '_update_job_progress(job_id, 60, "Step 4: Anomaly detection")\n            governor.check_and_throttle()\n            print(f"[FORENSIC] Running anomaly detection...")')


# 70% embedding
code = code.replace('print(f"[FORENSIC] Building vector index...")', '_update_job_progress(job_id, 70, "Step 5: Building vector index")\n            governor.check_and_throttle()\n            print(f"[FORENSIC] Building vector index...")')

# 85% graph building
code = code.replace('print(f"[FORENSIC] Building entity graph...")', '_update_job_progress(job_id, 85, "Step 6: Building entity graph")\n            governor.check_and_throttle()\n            print(f"[FORENSIC] Building entity graph...")')


# 95% saving entities
code = code.replace('_save_entities_to_db(\n                db, chunks, case_id, evidence_id, filename)', '_update_job_progress(job_id, 95, "Step 7: Saving entities")\n            governor.check_and_throttle()\n            _save_entities_to_db(db, chunks, case_id, evidence.id, filename)')

# completion and audit log
completion_for_code = """
            _update_job_progress(job_id, 100, "Complete")
            if job_id:
                db2 = SessionLocal()
                try:
                    j = db2.query(models.IngestionJob).filter(models.IngestionJob.id == job_id).first()
                    if j:
                        j.status = "Completed"
                        j.progress_percent = 100
                        j.completed_at = datetime.utcnow()
                        j.current_step = f"Complete — {artifact_count} artifacts"
                        db2.commit()
                finally:
                    db2.close()
"""
code = code.replace('print(f"[FORENSIC] Complete: "\n                  f"{artifact_count} artifacts, "\n                  f"{total_chunks} chunks, "\n                  f"{total_entities} entities")', completion_for_code + '\n            print(f"[FORENSIC] Complete: {artifact_count} artifacts, {total_chunks} chunks, {total_entities} entities")')

# Change evidence_id to evidence.id where needed inside the function for forensic ingestion
code = code.replace("evidence_id=evidence_id,", "evidence_id=evidence.id,")
code = code.replace("evidence_id\n                    == evidence_id", "evidence_id == evidence.id")
code = code.replace("evidence_id == evidence_id", "evidence_id == evidence.id")

# Write out the new ingestion.py
with open("backend/ingestion.py", "w") as f:
    f.write(code)

print("Ingestion script rewritten successfully")
