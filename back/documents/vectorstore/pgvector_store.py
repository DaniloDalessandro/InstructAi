"""
Interface com PGVector para busca semântica de documentos.
Busca vetorial (cosine similarity) + busca por keywords (icontains).
Resultado combinado e deduplicado = busca híbrida.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import List, Optional

from django.conf import settings
from django.db import connection

logger = logging.getLogger(__name__)


@dataclass
class SearchResult:
    chunk_id: int
    document_id: int
    document_title: str
    source_type: str
    content: str
    page_number: Optional[int]
    score: float
    chunk_metadata: dict = field(default_factory=dict)


def get_embedding(text: str) -> List[float]:
    """Gera embedding via OpenAI API."""
    from openai import OpenAI

    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    response = client.embeddings.create(
        model=settings.OPENAI_EMBEDDING_MODEL,
        input=text.replace("\n", " "),
    )
    return response.data[0].embedding


def vector_search(
    query: str,
    top_k: int = 6,
    source_types: Optional[List[str]] = None,
    min_score: float = 0.0,
) -> List[SearchResult]:
    """
    Busca semântica usando operador cosine distance (<=>).
    Retorna chunks mais similares à query.
    """
    embedding = get_embedding(query)
    embedding_str = "[" + ",".join(str(x) for x in embedding) + "]"

    source_filter = ""
    params: list = [embedding_str, top_k]

    if source_types:
        placeholders = ",".join(["%s"] * len(source_types))
        source_filter = f"AND kd.source_type IN ({placeholders})"
        params = [embedding_str] + source_types + [top_k]

    sql = f"""
        SELECT
            dc.id,
            dc.document_id,
            kd.title,
            kd.source_type,
            dc.content,
            dc.page_number,
            dc.chunk_metadata,
            1 - (dc.embedding <=> %s::vector) AS score
        FROM documents_documentchunk dc
        JOIN documents_knowledgedocument kd ON kd.id = dc.document_id
        WHERE kd.status = 'indexed'
        {source_filter}
        ORDER BY dc.embedding <=> %s::vector
        LIMIT %s
    """

    # Duplicate embedding_str for ORDER BY
    if source_types:
        params = [embedding_str] + source_types + [embedding_str, top_k]
    else:
        params = [embedding_str, embedding_str, top_k]

    results = []
    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        rows = cursor.fetchall()

    for row in rows:
        chunk_id, doc_id, title, src_type, content, page_num, meta, score = row
        if score >= min_score:
            results.append(
                SearchResult(
                    chunk_id=chunk_id,
                    document_id=doc_id,
                    document_title=title,
                    source_type=src_type,
                    content=content,
                    page_number=page_num,
                    score=round(float(score), 4),
                    chunk_metadata=meta or {},
                )
            )

    return results


def keyword_search(
    query: str,
    top_k: int = 4,
    source_types: Optional[List[str]] = None,
) -> List[SearchResult]:
    """
    Busca por palavras-chave usando ILIKE no conteúdo dos chunks.
    Complementa a busca vetorial.
    """
    from documents.models import DocumentChunk

    qs = DocumentChunk.objects.select_related("document").filter(
        document__status="indexed",
        content__icontains=query,
    )
    if source_types:
        qs = qs.filter(document__source_type__in=source_types)

    results = []
    for chunk in qs[:top_k]:
        results.append(
            SearchResult(
                chunk_id=chunk.id,
                document_id=chunk.document_id,
                document_title=chunk.document.title,
                source_type=chunk.document.source_type,
                content=chunk.content,
                page_number=chunk.page_number,
                score=0.5,  # score fixo para resultados keyword
                chunk_metadata=chunk.chunk_metadata,
            )
        )
    return results


def hybrid_search(
    query: str,
    top_k: int = 6,
    source_types: Optional[List[str]] = None,
) -> List[SearchResult]:
    """
    Combina busca vetorial + keyword, deduplicando por chunk_id.
    Prioriza resultados vetoriais (score mais alto).
    """
    vector_results = []
    keyword_results = []

    try:
        vector_results = vector_search(query, top_k=top_k, source_types=source_types)
    except Exception as e:
        logger.warning("Busca vetorial falhou: %s", e)

    try:
        keyword_results = keyword_search(query, top_k=max(2, top_k // 2), source_types=source_types)
    except Exception as e:
        logger.warning("Busca keyword falhou: %s", e)

    # Deduplica por chunk_id, mantendo o score mais alto
    seen: dict[int, SearchResult] = {}
    for r in vector_results + keyword_results:
        if r.chunk_id not in seen or r.score > seen[r.chunk_id].score:
            seen[r.chunk_id] = r

    # Retorna ordenado por score desc, limitado a top_k
    return sorted(seen.values(), key=lambda x: x.score, reverse=True)[:top_k]


def save_chunks_with_embeddings(document_id: int, chunks) -> int:
    """
    Gera embeddings e salva todos os chunks de um documento.
    Retorna quantidade de chunks salvos.
    chunks: List[TextChunk]
    """
    from openai import OpenAI
    from documents.models import DocumentChunk, KnowledgeDocument

    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    # Remove chunks anteriores do documento
    DocumentChunk.objects.filter(document_id=document_id).delete()

    doc = KnowledgeDocument.objects.get(id=document_id)
    texts = [c.content for c in chunks]

    # Gera embeddings em batch (máx 2048 por chamada)
    all_embeddings = []
    batch_size = 100
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        resp = client.embeddings.create(
            model=settings.OPENAI_EMBEDDING_MODEL,
            input=[t.replace("\n", " ") for t in batch],
        )
        all_embeddings.extend([d.embedding for d in resp.data])

    # Cria objetos em bulk
    chunk_objs = [
        DocumentChunk(
            document=doc,
            content=chunks[i].content,
            embedding=all_embeddings[i],
            chunk_index=chunks[i].chunk_index,
            page_number=chunks[i].page_number,
            token_count=len(chunks[i].content) // 4,
            chunk_metadata={
                "source_title": chunks[i].source_title,
                "source_type": chunks[i].source_type,
            },
        )
        for i in range(len(chunks))
    ]
    DocumentChunk.objects.bulk_create(chunk_objs, batch_size=50)
    return len(chunk_objs)
