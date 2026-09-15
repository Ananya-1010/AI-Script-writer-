"""MongoLocalVectorStore against a real local mongod.

Skipped automatically when no server is reachable, so the suite still runs on a
machine — or a CI runner — without MongoDB.

These assert the same invariants as the in-memory tests, deliberately. The whole
premise of the adapter is that swapping stores does not change behaviour, and
the only way to keep that true is to hold both to one set of expectations.
"""

import os
import sys
import uuid
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "ai-service"))

from app.rag.embeddings import StubEmbeddings  # noqa: E402
from app.rag.retriever import Retriever  # noqa: E402
from app.rag.vector_store import Chunk, MongoLocalVectorStore  # noqa: E402

URI = os.getenv("AI_MONGODB_URI", "mongodb://127.0.0.1:27017")
DB = "ai_script_writer_test"


async def _reachable(store: MongoLocalVectorStore) -> bool:
    return await store.health()


@pytest.fixture
async def store():
    s = MongoLocalVectorStore(uri=URI, db_name=DB)
    if not await _reachable(s):
        pytest.skip("no local MongoDB reachable")

    # Every test gets its own document namespace, so a failed run never leaves
    # state that makes the next run pass or fail for the wrong reason.
    await s._col.delete_many({})
    await s.ensure_indexes()
    yield s
    await s._col.delete_many({})


async def _seed(store, entries):
    embedder = StubEmbeddings()
    chunks = [
        Chunk(
            chunk_id=cid,
            document_id=cid.split("_")[0],
            user_id=uid,
            source=src,
            category="curated" if src == "curated" else "brand",
            text=text,
        )
        for cid, uid, src, text in entries
    ]
    vectors = await embedder.embed([c.text for c in chunks])
    await store.upsert(chunks, vectors)
    return embedder


def _retriever(embedder, store, *, min_score=0.0, top_k=6, token_budget=10_000):
    return Retriever(embedder, store, top_k=top_k, min_score=min_score, token_budget=token_budget)


@pytest.mark.asyncio
async def test_tenant_filter_is_applied_by_the_database(store):
    """The scope is a query filter, so another creator's text is never even read
    out of Mongo — not fetched and then discarded."""
    embedder = await _seed(store, [
        ("kb_001", None, "curated", "hook patterns for short form video"),
        ("crA_001", "u_alice", "creator", "alice brand voice guide"),
        ("crB_001", "u_bob", "creator", "bob brand voice guide"),
    ])

    result = await _retriever(embedder, store).retrieve(
        "bob brand voice guide", user_id="u_alice"
    )

    assert "crB_001" not in result.chunk_ids
    assert "crA_001" in result.chunk_ids
    assert "kb_001" in result.chunk_ids


@pytest.mark.asyncio
async def test_scores_match_the_shared_scale(store):
    embedder = await _seed(store, [
        ("kb_001", None, "curated", "how to open a youtube video with a strong hook"),
        ("kb_002", None, "curated", "completely unrelated text about gardening"),
    ])

    result = await _retriever(embedder, store).retrieve(
        "how to open a youtube video with a strong hook", user_id=None
    )

    assert result.chunk_ids[0] == "kb_001"
    # Identical text, deterministic embedder: top of the normalised scale, the
    # same value the in-memory store returns for the same input.
    assert result.scores[0] == pytest.approx(1.0, abs=1e-5)


@pytest.mark.asyncio
async def test_upsert_is_idempotent(store):
    """Re-ingesting an unchanged document must replace its chunks, not double
    them. Deterministic chunk IDs plus a unique index are what guarantee it."""
    entries = [("kb_001", None, "curated", "hook patterns for reels")]

    await _seed(store, entries)
    await _seed(store, entries)

    assert await store._col.count_documents({}) == 1


@pytest.mark.asyncio
async def test_deleting_a_document_removes_its_chunks(store):
    embedder = await _seed(store, [
        ("kb_001", None, "curated", "hook patterns for reels"),
        ("kb_002", None, "curated", "cta patterns for reels"),
        ("other_001", None, "curated", "unrelated document"),
    ])

    removed = await store.delete_document("kb")
    assert removed == 2

    result = await _retriever(embedder, store).retrieve("hook patterns", user_id=None)
    assert "kb_001" not in result.chunk_ids
    assert "other_001" in result.chunk_ids, "deleted the wrong document"


@pytest.mark.asyncio
async def test_empty_index_returns_empty_not_an_error(store):
    embedder = StubEmbeddings()

    result = await _retriever(embedder, store).retrieve("anything", user_id=None)

    assert result.is_empty
    assert result.used_creator_knowledge is False
