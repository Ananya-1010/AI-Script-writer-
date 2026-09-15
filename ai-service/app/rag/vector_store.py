"""Vector store behind an adapter, so the retrieval interface survives a change
of index technology (spec 5.6).

The one rule every implementation must honour: **the creator filter is applied
inside the query, not after it.** Filtering after retrieval means another
creator's text was already read into this process, and a bug anywhere downstream
leaks it. It also silently degrades quality — you ask for the top 6 and get 2
once the wrong-tenant matches are discarded.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Literal, Protocol

from ..config import settings
from ..errors import ServiceError

log = logging.getLogger("ai-service.vector")

Source = Literal["curated", "creator"]

# ---------------------------------------------------------------------------
# Score scale — every store MUST return similarity on this one scale.
#
# Atlas reports cosine as (1 + cos) / 2, so its scores live in [0, 1] where 0.5
# means "unrelated" and 1.0 means "identical". Raw cosine lives in [-1, 1].
# Mixing the two is a silent disaster: the same RETRIEVAL_MIN_SCORE would be
# permissive in one store and reject everything in the other, so retrieval
# quality would change when the store changed and nothing would say why.
#
# So every implementation normalises to the Atlas scale, and the threshold is
# defined against it. A threshold below 0.5 is meaningless — it accepts chunks
# that are less related than random.
# ---------------------------------------------------------------------------


def cosine_to_unit(cosine: float) -> float:
    """Map raw cosine [-1, 1] onto the [0, 1] scale Atlas reports."""
    return (1.0 + cosine) / 2.0


@dataclass(frozen=True)
class Chunk:
    chunk_id: str
    document_id: str
    user_id: str | None  # None == curated, shared by every creator
    source: Source
    category: str
    text: str


@dataclass(frozen=True)
class RetrievedChunk:
    chunk_id: str
    source: Source
    category: str
    text: str
    score: float


class VectorStore(Protocol):
    name: str

    async def upsert(self, chunks: list[Chunk], vectors: list[list[float]]) -> None: ...
    async def delete_document(self, document_id: str) -> int: ...
    async def search(
        self, vector: list[float], *, user_id: str | None, top_k: int
    ) -> list[RetrievedChunk]: ...
    async def health(self) -> bool: ...


class InMemoryVectorStore:
    """Development and test store. Exact search, no index, no service.

    Exact brute force is a feature here, not a shortcut: it removes approximate
    -search recall as a variable, so a retrieval test that fails is failing
    because of chunking, embedding or thresholds — never because ANN missed.
    """

    name = "memory"

    def __init__(self) -> None:
        self._rows: list[tuple[Chunk, list[float]]] = []

    async def upsert(self, chunks: list[Chunk], vectors: list[list[float]]) -> None:
        incoming = {chunk.chunk_id for chunk in chunks}
        self._rows = [row for row in self._rows if row[0].chunk_id not in incoming]
        self._rows.extend(zip(chunks, vectors))

    async def delete_document(self, document_id: str) -> int:
        before = len(self._rows)
        self._rows = [row for row in self._rows if row[0].document_id != document_id]
        return before - len(self._rows)

    async def search(
        self, vector: list[float], *, user_id: str | None, top_k: int
    ) -> list[RetrievedChunk]:
        # The scope is decided before any scoring happens: curated knowledge,
        # plus this creator's own documents and nobody else's.
        candidates = [
            row for row in self._rows
            if row[0].user_id is None or (user_id is not None and row[0].user_id == user_id)
        ]

        # Vectors are L2-normalised by the embedding provider, so the dot
        # product *is* cosine. Converted to the shared scale so this store and
        # Atlas can be compared against the same threshold.
        scored = [
            (chunk, cosine_to_unit(sum(a * b for a, b in zip(vector, stored))))
            for chunk, stored in candidates
        ]
        scored.sort(key=lambda pair: pair[1], reverse=True)

        return [
            RetrievedChunk(
                chunk_id=chunk.chunk_id,
                source=chunk.source,
                category=chunk.category,
                text=chunk.text,
                score=float(score),
            )
            for chunk, score in scored[:top_k]
        ]

    async def health(self) -> bool:
        return True


class MongoAtlasVectorStore:
    """MongoDB Atlas Vector Search.

    Worth choosing specifically because it removes a whole system: the vector
    index lives in the same cluster as the application data, so there is no
    second service to provision, secure, or keep in sync. The index is still
    derived and rebuildable from knowledgeDocuments (spec 7.4).

    Requires a search index named by VECTOR_INDEX_NAME, of type vectorSearch,
    with `userId` declared as a filter field — without that declaration Atlas
    cannot apply the tenant filter inside the query, which is the one thing this
    class must never compromise on.
    """

    name = "mongo-atlas"

    def __init__(self, uri: str, db_name: str, index_name: str, dimensions: int) -> None:
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
        except ImportError as exc:  # pragma: no cover
            raise ServiceError(
                "INTERNAL_ERROR", "Vector store is not configured."
            ) from exc

        self._client = AsyncIOMotorClient(uri)
        self._col = self._client[db_name]["knowledge_chunks"]
        self._index = index_name
        self._dimensions = dimensions

    async def upsert(self, chunks: list[Chunk], vectors: list[list[float]]) -> None:
        from pymongo import ReplaceOne

        operations = [
            ReplaceOne(
                {"chunkId": chunk.chunk_id},
                {
                    "chunkId": chunk.chunk_id,
                    "documentId": chunk.document_id,
                    "userId": chunk.user_id,
                    "source": chunk.source,
                    "category": chunk.category,
                    "text": chunk.text,
                    "embedding": vector,
                },
                upsert=True,
            )
            for chunk, vector in zip(chunks, vectors)
        ]
        if operations:
            await self._col.bulk_write(operations, ordered=False)

    async def delete_document(self, document_id: str) -> int:
        result = await self._col.delete_many({"documentId": document_id})
        return result.deleted_count

    async def search(
        self, vector: list[float], *, user_id: str | None, top_k: int
    ) -> list[RetrievedChunk]:
        # Curated chunks carry userId: null. This says "curated OR mine" and is
        # evaluated by Atlas as part of the vector search itself.
        scope: dict = {"userId": None} if user_id is None else {
            "$or": [{"userId": None}, {"userId": user_id}]
        }

        pipeline = [
            {
                "$vectorSearch": {
                    "index": self._index,
                    "path": "embedding",
                    "queryVector": vector,
                    # Atlas needs a wider candidate pool than k to return good
                    # results; the usual guidance is ~10-20x.
                    "numCandidates": max(top_k * 15, 100),
                    "limit": top_k,
                    "filter": scope,
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "chunkId": 1,
                    "source": 1,
                    "category": 1,
                    "text": 1,
                    "score": {"$meta": "vectorSearchScore"},
                }
            },
        ]

        try:
            rows = await self._col.aggregate(pipeline).to_list(length=top_k)
        except Exception as exc:
            log.warning("vector_search_failed", extra={"store": self.name})
            raise ServiceError("RETRIEVAL_FAILED", "Knowledge lookup failed.") from exc

        return [
            RetrievedChunk(
                chunk_id=row["chunkId"],
                source=row["source"],
                category=row["category"],
                text=row["text"],
                score=float(row["score"]),
            )
            for row in rows
        ]

    async def health(self) -> bool:
        try:
            await self._client.admin.command("ping")
            return True
        except Exception:
            return False


def build_vector_store() -> VectorStore:
    if settings.vector_store == "memory":
        return InMemoryVectorStore()
    if settings.vector_store == "mongo":
        return MongoAtlasVectorStore(
            uri=settings.ai_mongodb_uri,
            db_name=settings.ai_mongodb_db,
            index_name=settings.vector_index_name,
            dimensions=settings.embedding_dimensions,
        )
    raise ServiceError("INTERNAL_ERROR", "Vector store is not configured.")
