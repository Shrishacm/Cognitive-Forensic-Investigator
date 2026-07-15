from qdrant_client import QdrantClient
from qdrant_client.models import (Distance,
    VectorParams, PointStruct)
from sentence_transformers import SentenceTransformer
import uuid
import os

VECTOR_SIZE = 768
model = SentenceTransformer(
    "nomic-ai/nomic-embed-text-v1",
    trust_remote_code=True
)


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

        points = []
        for i, chunk in enumerate(chunks):
            embedding = model.encode(chunk).tolist()
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
        query_vector = model.encode(query).tolist()

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
