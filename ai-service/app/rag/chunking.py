"""Document splitting.

Chunking is the quietest determinant of retrieval quality. Two failure modes
matter more than the algorithm:

- **Too large** and every chunk is about several things, so it matches every
  query weakly and nothing strongly. Scores flatten and the threshold stops
  discriminating.
- **Split mid-idea** and the half that carries the meaning loses the half that
  carries the keywords, so the right chunk scores low and never surfaces.

So: split on paragraph boundaries first, fall back to sentences, and overlap a
little to survive an idea that straddles a boundary.
"""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass

# ~4 characters per token is a good enough approximation for budgeting, and it
# costs nothing. A real tokeniser here would add a dependency to save very little.
CHARS_PER_TOKEN = 4

DEFAULT_CHUNK_CHARS = 1200
DEFAULT_OVERLAP_CHARS = 150
MIN_CHUNK_CHARS = 120

_PARAGRAPH = re.compile(r"\n\s*\n")
_SENTENCE = re.compile(r"(?<=[.!?])\s+")


@dataclass(frozen=True)
class TextChunk:
    chunk_id: str
    text: str
    index: int


def estimate_tokens(text: str) -> int:
    return max(1, len(text) // CHARS_PER_TOKEN)


def _split_oversized(block: str, limit: int) -> list[str]:
    """A paragraph longer than the limit is split on sentences, and a sentence
    longer than the limit is cut hard — rare, but a single unbroken wall of text
    must not defeat chunking entirely."""
    if len(block) <= limit:
        return [block]

    pieces: list[str] = []
    current = ""

    for sentence in _SENTENCE.split(block):
        if len(sentence) > limit:
            if current:
                pieces.append(current)
                current = ""
            pieces.extend(
                sentence[i : i + limit] for i in range(0, len(sentence), limit)
            )
            continue

        if len(current) + len(sentence) + 1 > limit:
            pieces.append(current)
            current = sentence
        else:
            current = f"{current} {sentence}".strip()

    if current:
        pieces.append(current)
    return pieces


def chunk_document(
    document_id: str,
    text: str,
    *,
    chunk_chars: int = DEFAULT_CHUNK_CHARS,
    overlap_chars: int = DEFAULT_OVERLAP_CHARS,
) -> list[TextChunk]:
    text = (text or "").strip()
    if not text:
        return []

    blocks: list[str] = []
    for paragraph in _PARAGRAPH.split(text):
        paragraph = paragraph.strip()
        if paragraph:
            blocks.extend(_split_oversized(paragraph, chunk_chars))

    # Pack blocks up to the limit so a document of short paragraphs does not
    # become a hundred chunks of one line each.
    packed: list[str] = []
    current = ""
    for block in blocks:
        if not current:
            current = block
        elif len(current) + len(block) + 2 <= chunk_chars:
            current = f"{current}\n\n{block}"
        else:
            packed.append(current)
            # Carry a tail of the previous chunk so an idea spanning the seam is
            # still retrievable from at least one side of it.
            tail = current[-overlap_chars:] if overlap_chars else ""
            current = f"{tail}\n\n{block}".strip() if tail else block

    if current:
        packed.append(current)

    # A trailing scrap shorter than MIN_CHUNK_CHARS is noise that will match
    # weakly against everything; fold it back into its predecessor.
    if len(packed) > 1 and len(packed[-1]) < MIN_CHUNK_CHARS:
        packed[-2] = f"{packed[-2]}\n\n{packed[-1]}"
        packed.pop()

    return [
        TextChunk(
            # Deterministic: re-ingesting an unchanged document reuses the same
            # chunk IDs, so an upsert replaces rather than duplicates.
            chunk_id=f"{document_id}_{index:04d}_{hashlib.sha1(body.encode()).hexdigest()[:8]}",
            text=body,
            index=index,
        )
        for index, body in enumerate(packed)
    ]
