"""Retrieval unit tests. Zero API calls, zero database, zero cost.

This is the payoff from injecting providers rather than constructing them:
these exercise the *real* Retriever against a stub embedder and the in-memory
store, so the logic under test is the logic that runs in production.

The tenant-isolation test is the one that matters most. It is the invariant
whose failure is silent — nothing errors, a creator simply sees text that is not
theirs.
"""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "ai-service"))

from app.rag.chunking import chunk_document  # noqa: E402
from app.rag.embeddings import StubEmbeddings  # noqa: E402
from app.rag.retriever import Retriever, build_retrieval_query  # noqa: E402
from app.rag.vector_store import Chunk, InMemoryVectorStore, cosine_to_unit  # noqa: E402


async def _store_with(entries):
    """entries: list of (chunk_id, user_id, source, text)"""
    embedder = StubEmbeddings()
    store = InMemoryVectorStore()

    chunks = [
        Chunk(
            chunk_id=chunk_id,
            document_id=chunk_id.split("_")[0],
            user_id=user_id,
            source=source,
            category="curated" if source == "curated" else "brand",
            text=text,
        )
        for chunk_id, user_id, source, text in entries
    ]
    vectors = await embedder.embed([c.text for c in chunks])
    await store.upsert(chunks, vectors)
    return embedder, store


def _retriever(embedder, store, *, min_score=0.0, top_k=6, token_budget=10_000):
    return Retriever(
        embedder, store, top_k=top_k, min_score=min_score, token_budget=token_budget
    )


@pytest.mark.asyncio
async def test_creator_knowledge_is_scoped_to_its_owner():
    """TEST-007: creator A must never see creator B's chunks, even when B's text
    is a perfect match for A's query."""
    embedder, store = await _store_with([
        ("kb_001", None, "curated", "hook patterns for short form video"),
        ("crA_001", "u_alice", "creator", "alice brand voice guide"),
        ("crB_001", "u_bob", "creator", "bob brand voice guide"),
    ])

    result = await _retriever(embedder, store).retrieve(
        "bob brand voice guide", user_id="u_alice"
    )

    ids = result.chunk_ids
    assert "crB_001" not in ids, "leaked another creator's chunk"
    assert "crA_001" in ids
    assert "kb_001" in ids, "curated knowledge is shared and must still appear"


@pytest.mark.asyncio
async def test_exact_match_outranks_unrelated_text():
    embedder, store = await _store_with([
        ("kb_001", None, "curated", "how to open a youtube video with a strong hook"),
        ("kb_002", None, "curated", "completely unrelated text about gardening"),
    ])

    result = await _retriever(embedder, store).retrieve(
        "how to open a youtube video with a strong hook", user_id=None
    )

    assert result.chunk_ids[0] == "kb_001"
    # Identical text against a deterministic embedder is the top of the scale.
    assert result.scores[0] == pytest.approx(1.0, abs=1e-6)


@pytest.mark.asyncio
async def test_nothing_above_threshold_returns_empty_and_does_not_raise():
    """TEST-006: an empty context set is a valid outcome. Generation must never
    depend on retrieval succeeding."""
    embedder, store = await _store_with([
        ("kb_001", None, "curated", "unrelated text about gardening"),
    ])

    result = await _retriever(embedder, store, min_score=0.99).retrieve(
        "youtube hook patterns", user_id=None
    )

    assert result.is_empty
    assert result.dropped_below_threshold == 1
    assert result.used_creator_knowledge is False


@pytest.mark.asyncio
async def test_token_budget_trims_the_context_set():
    """Six long chunks can cost more than the brief itself, so k is not the only
    bound that matters."""
    embedder, store = await _store_with([
        (f"kb_{i:03d}", None, "curated", f"hook patterns {i} " + ("padding " * 200))
        for i in range(5)
    ])

    result = await _retriever(embedder, store, token_budget=400).retrieve(
        "hook patterns", user_id=None
    )

    assert result.dropped_by_token_cap > 0
    assert len(result.chunks) < 5


@pytest.mark.asyncio
async def test_deleting_a_document_removes_its_chunks_from_retrieval():
    """TEST-015: after deletion the chunks must not appear in any retrieval trace."""
    embedder, store = await _store_with([
        ("kb_001", None, "curated", "hook patterns for reels"),
        ("kb_002", None, "curated", "cta patterns for reels"),
    ])

    removed = await store.delete_document("kb")
    assert removed == 2

    result = await _retriever(embedder, store).retrieve("hook patterns", user_id=None)
    assert result.is_empty


def test_retrieval_query_carries_intent_not_just_the_idea():
    query = build_retrieval_query({
        "idea": "lifestyle inflation",
        "platform": "youtube",
        "contentType": "educational",
        "objective": "make the viewer track one month of spending",
    })

    # Platform and content type are what surface scripting knowledge rather than
    # merely topical documents.
    assert "youtube" in query
    assert "educational" in query
    assert "lifestyle inflation" in query


def test_score_scale_is_normalised_to_atlas_semantics():
    assert cosine_to_unit(1.0) == pytest.approx(1.0)   # identical
    assert cosine_to_unit(0.0) == pytest.approx(0.5)   # unrelated
    assert cosine_to_unit(-1.0) == pytest.approx(0.0)  # opposite


def test_chunking_keeps_chunk_ids_stable_across_reingestion():
    text = "\n\n".join(f"Paragraph {i}. " + ("word " * 60) for i in range(6))

    first = chunk_document("k_2a70", text)
    second = chunk_document("k_2a70", text)

    assert len(first) > 1
    assert [c.chunk_id for c in first] == [c.chunk_id for c in second], (
        "unstable chunk IDs would duplicate every chunk on re-ingestion"
    )
