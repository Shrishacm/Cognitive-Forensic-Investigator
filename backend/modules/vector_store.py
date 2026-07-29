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


def get_batch_embeddings(texts: list[str]) -> list[list[float]]:
    """
    Generates 768-d vector embeddings for a batch of texts.
    Uses GPU natively via SentenceTransformers tensor batching.
    """
    if not texts:
        return []
        
    return model.encode(texts, batch_size=32).tolist()



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


def store_chunks(chunks: list[str],
                 source_filename: str,
                 evidence_id: str,
                 case_id: str,
                 qdrant_path: str) -> int:
    """
    Embeds and stores chunks in the case collection.
    Returns number of chunks stored.
    """
    if not chunks:
        return 0
        
    try:
        client = get_client(qdrant_path)
        collection = get_collection_name(case_id)
        ensure_collection(client, collection)

        points = []
        embeddings = get_batch_embeddings(chunks)
        
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            points.append(PointStruct(
                id=str(uuid.uuid4()),
                vector=embedding,
                payload={
                    "text": chunk,
                    "source": source_filename,
                    "evidence_id": evidence_id,
                    "case_id": case_id,
                    "chunk_index": i
                }
            ))

        client.upsert(
            collection_name=collection,
            points=points
        )
        return len(points)

    except Exception as e:
        print(f"QDRANT STORE ERROR: {e}")
        return 0


def search_chunks(query: str,
                  case_id: str,
                  qdrant_path: str,
                  top_k: int = 7,
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
