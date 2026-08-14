from qdrant_client import QdrantClient
from qdrant_client.models import (Distance,
    VectorParams, PointStruct)
import uuid
import os

VECTOR_SIZE = 768
import requests
from backend.dependencies import get_settings

def get_ollama_embeddings(texts: list[str]) -> list[list[float]]:
    """
    Calls local Ollama server to generate batch embeddings.
    """
    settings = get_settings()
    url = f"{settings.ollama_base_url}/api/embed"
    data = {
        "model": "nomic-embed-text",
        "input": texts
    }
    try:
        res = requests.post(url, json=data, timeout=60)
        res.raise_for_status()
        res_json = res.json()
        if "embeddings" in res_json:
            return res_json["embeddings"]
        else:
            raise ValueError(f"Ollama response missing 'embeddings' key: {res_json}")
    except Exception as e:
        print(f"OLLAMA EMBEDDING ERROR: {e}")
        raise


def get_collection_name(case_id: str) -> str:
    """
    Each case gets its own Qdrant collection.
    Format: case_{case_id_first_8_chars}
    """
    return f"case_{case_id[:8]}"


def get_client(qdrant_path: str) -> QdrantClient:
    """Returns Qdrant client for given path."""
    return QdrantClient(path=qdrant_path)


def ensure_collection(client: QdrantClient,
                       collection_name: str):
    """Creates collection if it does not exist."""
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


def store_chunks(chunks: list[str],
                 source_filename: str,
                 evidence_id: str,
                 case_id: str,
                 qdrant_path: str) -> int:
    """
    Embeds and stores chunks in the case collection.
    Returns number of chunks stored.
    """
    try:
        client = get_client(qdrant_path)
        collection = get_collection_name(case_id)
        ensure_collection(client, collection)

        # Batch encode all chunks via local Ollama API
        embeddings = []
        if chunks:
            embeddings = get_ollama_embeddings(chunks)

        points = []
        for i, chunk in enumerate(chunks):
            embedding = embeddings[i]
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
        query_vector = get_ollama_embeddings([query])[0]

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

        results = client.search(
            collection_name=collection,
            query_vector=query_vector,
            limit=top_k,
            with_payload=True,
            query_filter=query_filter
        )

        return [{
            "text": r.payload.get("text", ""),
            "source": r.payload.get("source", ""),
            "evidence_id": r.payload.get(
                "evidence_id", ""),
            "chunk_index": r.payload.get(
                "chunk_index", 0),
            "score": round(r.score, 3)
        } for r in results]

    except Exception as e:
        print(f"QDRANT SEARCH ERROR: {e}")
        return []


def delete_case_collection(case_id: str,
                            qdrant_path: str):
    """Deletes entire Qdrant collection for a case."""
    try:
        client = get_client(qdrant_path)
        collection = get_collection_name(case_id)
        client.delete_collection(collection)
    except Exception as e:
        print(f"QDRANT DELETE ERROR: {e}")
