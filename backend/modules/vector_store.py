from qdrant_client import QdrantClient
from qdrant_client.models import (Distance,
    VectorParams, PointStruct)
from sentence_transformers import SentenceTransformer
import uuid
import os
import requests
import torch

def get_ingestion_device() -> str:
    """Returns 'cuda' or 'cpu' based on system GPU availability and HARDWARE_MODE."""
    mode = os.getenv("HARDWARE_MODE", "auto").lower()
    if mode == "cpu":
        return "cpu"
    if torch.cuda.is_available():
        return "cuda"
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return "mps"
    return "cpu"

device = get_ingestion_device()
print(f"[VECTOR_STORE] Ingestion Embedding Model Device: {device.upper()}")

VECTOR_SIZE = 768
model = SentenceTransformer(
    "nomic-ai/nomic-embed-text-v1",
    trust_remote_code=True,
    device=device
)


def get_single_embedding(text: str) -> list[float]:
    """
    Generates 768-d vector embedding.
    Uses GPU via Ollama CUDA embed API ('nomic-embed-text') if available,
    otherwise uses SentenceTransformers.
    """
    mode = os.getenv("HARDWARE_MODE", "auto").lower()
    if mode != "cpu":
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

    return model.encode(text).tolist()


# CPU-only model instance for parallel auto mode
_cpu_model = None

def _get_cpu_model():
    """Lazy-init a CPU-bound SentenceTransformer for parallel auto mode."""
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
      auto  — splits work between GPU and CPU in parallel threads
      cuda  — GPU only
      cpu   — CPU only
    batch_size is passed through from the analysis_mode params.
    """
    if not texts:
        return []

    mode = os.getenv("HARDWARE_MODE", "auto").lower()

    if mode == "auto" and device == "cuda":
        # ── Auto mode: If GPU is present, use GPU for everything. CPU offloading 
        # bottlenecks the batch because CPU encodes 20x slower than GPU, and doubles RAM.
        pass

    # ── Single-device path (cuda-only or cpu-only) ──
    return model.encode(
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
