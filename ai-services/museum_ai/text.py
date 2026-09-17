"""Text helpers: narration script and sentence-aware chunking.

TTS models stay stable on short inputs, so narration is synthesised sentence by
sentence (grouped up to `max_chars`) and the pieces are joined afterwards.
"""

from __future__ import annotations

import re
from typing import List, Optional

# Terminators followed by a space (Latin, Cyrillic, Arabic, Devanagari), and
# terminators of scripts that do not put a space after them (CJK, Khmer).
_SPACED_TERMINATORS = ".!?;…؟۔।॥"
_UNSPACED_TERMINATORS = "。！？；។៕"
_TERMINATORS = _SPACED_TERMINATORS + _UNSPACED_TERMINATORS
_SENTENCE_BOUNDARY = re.compile(
    rf"(?:(?<=[{re.escape(_SPACED_TERMINATORS)}])|(?<=[{re.escape(_SPACED_TERMINATORS)}][\"'”’)\]]))\s+"
    rf"|(?<=[{_UNSPACED_TERMINATORS}])\s*"
)


def narration_text(title: str, short_description: Optional[str], description: Optional[str]) -> str:
    """Title, summary and body as one script, each part ending like a sentence."""
    parts = [part.strip() for part in (title, short_description, description) if part and part.strip()]
    script = []
    for part in parts:
        script.append(part if part[-1] in _TERMINATORS else f"{part}.")
    return "\n".join(script)


def split_paragraphs(text: str) -> List[str]:
    return [paragraph.strip() for paragraph in re.split(r"\n\s*\n", text) if paragraph.strip()]


def split_sentences(text: str) -> List[str]:
    sentences: List[str] = []
    for line in text.splitlines():
        sentences.extend(piece.strip() for piece in _SENTENCE_BOUNDARY.split(line) if piece.strip())
    return sentences


def chunk_text(text: str, max_chars: int) -> List[str]:
    """Groups whole sentences into chunks of at most `max_chars` characters.

    A sentence longer than the limit is split on spaces, or hard-split for
    scripts written without spaces.
    """
    chunks: List[str] = []
    current = ""
    for sentence in split_sentences(text):
        for piece in _split_long(sentence, max_chars):
            candidate = f"{current} {piece}".strip() if current else piece
            if len(candidate) <= max_chars:
                current = candidate
            else:
                chunks.append(current)
                current = piece
    if current:
        chunks.append(current)
    return chunks


def _split_long(sentence: str, max_chars: int) -> List[str]:
    pieces: List[str] = []
    rest = sentence
    while len(rest) > max_chars:
        cut = rest.rfind(" ", 0, max_chars + 1)
        if cut <= 0:
            cut = max_chars
        pieces.append(rest[:cut].strip())
        rest = rest[cut:].strip()
    if rest:
        pieces.append(rest)
    return pieces
