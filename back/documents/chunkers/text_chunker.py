"""
Divide texto em chunks inteligentes para indexação no vetor DB.
Usa RecursiveCharacterTextSplitter do LangChain com overlap configurável.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional


CHUNK_SIZE = 800       # tokens aproximados por chunk
CHUNK_OVERLAP = 150    # overlap para manter contexto entre chunks


@dataclass
class TextChunk:
    content: str
    chunk_index: int
    page_number: Optional[int] = None
    source_title: str = ""
    source_type: str = ""


def split_text(
    text: str,
    source_title: str = "",
    source_type: str = "",
    chunk_size: int = CHUNK_SIZE,
    chunk_overlap: int = CHUNK_OVERLAP,
) -> List[TextChunk]:
    """
    Divide texto simples em chunks. Usa RecursiveCharacterTextSplitter.
    Estima ~4 chars por token (heurística rápida sem tokenizer).
    """
    from langchain_text_splitters import RecursiveCharacterTextSplitter

    # ~4 chars/token heurístico — evita overhead do tiktoken aqui
    char_size = chunk_size * 4
    char_overlap = chunk_overlap * 4

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=char_size,
        chunk_overlap=char_overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
        length_function=len,
    )

    parts = splitter.split_text(text)
    return [
        TextChunk(
            content=part,
            chunk_index=i,
            source_title=source_title,
            source_type=source_type,
        )
        for i, part in enumerate(parts)
        if part.strip()
    ]


def split_pages(
    pages: list,  # List[PageContent]
    source_title: str = "",
    source_type: str = "",
    chunk_size: int = CHUNK_SIZE,
    chunk_overlap: int = CHUNK_OVERLAP,
) -> List[TextChunk]:
    """
    Divide texto mantendo referência de página.
    Cada página é dividida independentemente para preservar o número de página.
    """
    from langchain_text_splitters import RecursiveCharacterTextSplitter

    char_size = chunk_size * 4
    char_overlap = chunk_overlap * 4

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=char_size,
        chunk_overlap=char_overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
        length_function=len,
    )

    chunks: List[TextChunk] = []
    global_idx = 0

    for page in pages:
        parts = splitter.split_text(page.text)
        for part in parts:
            if part.strip():
                chunks.append(
                    TextChunk(
                        content=part,
                        chunk_index=global_idx,
                        page_number=page.page_number,
                        source_title=source_title,
                        source_type=source_type,
                    )
                )
                global_idx += 1

    return chunks


def estimate_tokens(text: str) -> int:
    """Estimativa rápida de tokens (4 chars ≈ 1 token)."""
    return len(text) // 4
