from qdrant_client import QdrantClient
from qdrant_client.models import (Distance,
    VectorParams, PointStruct)
from sentence_transformers import SentenceTransformer
import uuid
import os
import requests

# Single source-of-truth hardware detection
from backend.modules.hardware import detect_device

VECTOR_SIZE = 768

# ── Embedding model singleton ──────────────────────────────────────────────
# Tracks which device the loaded model is on so the telemetry API can report
# the *actual* embedding device, not just what HARDWARE_MODE says.
_model_cache: dict = {}   # {device_str: SentenceTransformer}
_model_device: str = ""   # current loaded device — read by hardware.get_hardware_info()


def get_model() -> SentenceTransformer:
    """
    Returns the singleton embedding model, hot-reloading onto the correct
    device whenever HARDWARE_MODE changes at runtime.
    """
    global _model_cache, _model_device
    wanted = detect_device()
    if wanted not in _model_cache:
        if _model_cache:
            print(f"[VECTOR_STORE] Device change ({_model_device} → {wanted}). Reloading model…")
            _model_cache.clear()
        print(f"[VECTOR_STORE] Loading embedding model on {wanted.upper()}…")
        m = SentenceTransformer(
            "nomic-ai/nomic-embed-text-v1",
            trust_remote_code=True,
            device=wanted
        )
        # Explicit .to() in case SentenceTransformer ignores device= on some platforms
        try:
            m = m.to(wanted)
        except Exception:
            pass
        _model_cache[wanted] = m
        _model_device = wanted
        print(f"[VECTOR_STORE] Model ready on {wanted.upper()}")
    return _model_cache[wanted]

def get_single_embedding(text: str) -> list[float]:
    """
    Generates 768-d vector embedding.
    Priority:
      1. Ollama embed API (GPU-accelerated if Ollama uses GPU)
      2. SentenceTransformers on detected device
      3. CPU fallback on OOM
    """
    current_device = detect_device()
    if current_device != "cpu":
        # Try Ollama's embed endpoint first — it runs on whatever device Ollama uses
        try:
            r = requests.post(
                "http://localhost:11434/api/embed",
                json={"model": "nomic-embed-text", "input": text},
                timeout=5
            )
            if r.status_code == 200:
                embeddings = r.json().get("embeddings", [])
                if embeddings and len(embeddings[0]) == VECTOR_SIZE:
                    return embeddings[0]
        except Exception:
            pass

    # SentenceTransformers path with OOM fallback
    try:
        return get_model().encode(text).tolist()
    except RuntimeError as e:
        if "out of memory" in str(e).lower() or "CUDA out of memory" in str(e):
            import torch
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            return _get_cpu_model().encode(text).tolist()
        raise


# CPU-only fallback model — used only on OOM, never on CPU-mode path
_cpu_model = None


def _get_cpu_model() -> SentenceTransformer:
    """Lazy-init a CPU-bound SentenceTransformer used only as OOM fallback."""
    global _cpu_model
    if _cpu_model is None:
        _cpu_model = SentenceTransformer(
            "nomic-ai/nomic-embed-text-v1",
            trust_remote_code=True,
            device="cpu"
        )
    return _cpu_model


def get_batch_embeddings(texts: list[str], batch_size: int = 128) -> list[list[float]]:
    """
    Generates 768-d vector embeddings for a batch of texts.

    Hardware mode behaviour:
      auto/cuda — GPU if available, CPU OOM fallback
      cpu       — CPU only
    batch_size is passed through from the analysis_mode params.
    """
    if not texts:
        return []

    current_device = get_ingestion_device()

    # GPU path — use the GPU model; fall back to CPU on OOM
    if current_device in ("cuda", "mps"):
        try:
            m = get_model()
            return m.encode(
                texts,
                batch_size=batch_size,
                show_progress_bar=False,
                convert_to_numpy=True
            ).tolist()
        except RuntimeError as e:
            if "out of memory" in str(e).lower():
                print(f"[VECTOR_STORE] CUDA OOM — falling back to CPU for this batch")
                torch.cuda.empty_cache()
                cpu_m = _get_cpu_model()
                return cpu_m.encode(
                    texts,
                    batch_size=max(16, batch_size // 4),
                    show_progress_bar=False,
                    convert_to_numpy=True
                ).tolist()
            raise

    # CPU path
    m = get_model()
    return m.encode(
        texts,
        batch_size=batch_size,
        show_progress_bar=False,
        convert_to_numpy=True
    ).tolist()


def get_collection_name(case_id: str) -> str:
    """
    Each case gets its own Qdrant collection.
    Format: case_{case_id_first_8_chars}
    """
    return f"case_{case_id[:8]}"


# ── Client & collection caches (avoid re-instantiation per batch) ────────
_client_cache = {}
_ensured_collections = set()


def get_client(qdrant_path: str) -> QdrantClient:
    """Returns cached Qdrant client for given path."""
    if qdrant_path not in _client_cache:
        _client_cache[qdrant_path] = QdrantClient(path=qdrant_path)
    return _client_cache[qdrant_path]


def ensure_collection(client: QdrantClient,
                       collection_name: str):
    """Creates collection if it does not exist. Skips check if already ensured."""
    if collection_name in _ensured_collections:
        return
    existing = [c.name for c in
                client.get_collections().collections]
    if collection_name not in existing:
        client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(
                size=VECTOR_SIZE,
                distance=Distance.COSINE
            )
        )
    _ensured_collections.add(collection_name)


# Qdrant upsert max points per batch — stay under 10MB payload limit
_QDRANT_UPSERT_BATCH = 512


def store_chunks(chunks: list[str],
                 source_filename: str,
                 evidence_id: str,
                 case_id: str,
                 qdrant_path: str,
                 batch_size: int = 128) -> int:
    """
    Embeds and stores chunks in the case collection.
    Embeddings are computed in one GPU batch (or parallel CPU+GPU in auto mode).
    Qdrant upserts are batched separately to avoid payload size limits.
    Returns number of chunks stored.
    """
    if not chunks:
        return 0

    try:
        client = get_client(qdrant_path)
        collection = get_collection_name(case_id)
        ensure_collection(client, collection)

        # Compute ALL embeddings — maximises GPU (or GPU+CPU parallel) utilisation
        embeddings = get_batch_embeddings(chunks, batch_size=batch_size)

        points = [
            PointStruct(
                id=str(uuid.uuid4()),
                vector=embedding,
                payload={
                    "text": chunk,
                    "source": source_filename,
                    "evidence_id": evidence_id,
                    "case_id": case_id,
                    "chunk_index": i
                }
            )
            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings))
        ]

        # Upsert in batches to stay under Qdrant's request size limit
        for batch_start in range(0, len(points), _QDRANT_UPSERT_BATCH):
            client.upsert(
                collection_name=collection,
                points=points[batch_start:batch_start + _QDRANT_UPSERT_BATCH]
            )

        # Clean up memory immediately
        import gc
        import torch
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

        return len(points)

    except Exception as e:
        print(f"QDRANT STORE ERROR: {e}")
        return 0


def search_chunks(query: str,
                  case_id: str,
                  qdrant_path: str,
                  top_k: int = 5,
                  evidence_id: str = None
                  ) -> list[dict]:
    """
    Searches for semantically similar chunks.
    Optionally filters by evidence_id.
    """
    try:
        client = get_client(qdrant_path)
        collection = get_collection_name(case_id)
        existing = [c.name for c in client.get_collections().collections]
        if collection not in existing:
            return []
        query_vector = get_single_embedding(query)

        query_filter = None
        if evidence_id:
            from qdrant_client.models import (
                Filter, FieldCondition, MatchValue)
            query_filter = Filter(
                must=[FieldCondition(
                    key="evidence_id",
                    match=MatchValue(value=evidence_id)
                )]
            )

        if hasattr(client, "query_points"):
            res = client.query_points(
                collection_name=collection,
                query=query_vector,
                limit=top_k,
                with_payload=True,
                query_filter=query_filter
            )
            raw_points = getattr(res, "points", res)
        elif hasattr(client, "search"):
            raw_points = client.search(
                collection_name=collection,
                query_vector=query_vector,
                limit=top_k,
                with_payload=True,
                query_filter=query_filter
            )
        else:
            raw_points = []

        return [{
            "text": getattr(r, "payload", {}).get("text", "") if hasattr(r, "payload") else r.get("payload", {}).get("text", ""),
            "source": getattr(r, "payload", {}).get("source", "") if hasattr(r, "payload") else r.get("payload", {}).get("source", ""),
            "evidence_id": getattr(r, "payload", {}).get("evidence_id", "") if hasattr(r, "payload") else r.get("payload", {}).get("evidence_id", ""),
            "score": round(float(getattr(r, "score", 0.0)), 4)
        } for r in raw_points]

    except Exception as e:
        print(f"QDRANT SEARCH ERROR: {e}")
        return []
