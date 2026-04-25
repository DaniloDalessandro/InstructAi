"""
Tools de busca na base de conhecimento RAG (PGVector).
"""
from __future__ import annotations

import json
import logging
from typing import Optional

from langchain_core.tools import tool

logger = logging.getLogger(__name__)


@tool
def search_knowledge_base(query: str, source_type: Optional[str] = None) -> str:
    """
    Busca na base de conhecimento usando busca híbrida (vetorial + keyword).
    Use para responder perguntas sobre manuais, tutoriais, procedimentos e cursos.

    Args:
        query: pergunta ou termo de busca em linguagem natural
        source_type: filtra por tipo (manual, tutorial, course, faq, procedure). Opcional.
    """
    from documents.vectorstore.pgvector_store import hybrid_search

    try:
        source_types = [source_type] if source_type else None
        results = hybrid_search(query, top_k=5, source_types=source_types)

        if not results:
            return json.dumps({
                "found": False,
                "message": "Nenhum resultado encontrado na base de conhecimento para esta busca.",
                "results": [],
            }, ensure_ascii=False)

        formatted = []
        for r in results:
            page_info = f", página {r.page_number}" if r.page_number else ""
            formatted.append({
                "document_title": r.document_title,
                "source_type": r.source_type,
                "page": r.page_number,
                "relevance": round(r.score, 3),
                "content": r.content[:800],
                "citation": f"{r.document_title}{page_info}",
            })

        return json.dumps({
            "found": True,
            "count": len(formatted),
            "results": formatted,
        }, ensure_ascii=False)

    except Exception as e:
        logger.error("Erro na busca: %s", e)
        return json.dumps({"found": False, "error": str(e), "results": []}, ensure_ascii=False)


@tool
def search_manuals(query: str) -> str:
    """
    Busca especificamente em manuais PDF cadastrados no sistema.
    Use quando o usuário perguntar sobre um manual específico.

    Args:
        query: termo de busca no conteúdo dos manuais
    """
    from documents.vectorstore.pgvector_store import hybrid_search

    try:
        results = hybrid_search(query, top_k=4, source_types=["manual"])

        if not results:
            return json.dumps({
                "found": False,
                "message": "Nenhum manual encontrado para esta busca.",
            }, ensure_ascii=False)

        formatted = [
            {
                "manual": r.document_title,
                "page": r.page_number,
                "content": r.content[:600],
                "relevance": round(r.score, 3),
            }
            for r in results
        ]
        return json.dumps({"found": True, "manuals": formatted}, ensure_ascii=False)

    except Exception as e:
        return json.dumps({"found": False, "error": str(e)}, ensure_ascii=False)


@tool
def search_tutorials(query: str) -> str:
    """
    Busca em tutoriais cadastrados no sistema.
    Use quando o usuário perguntar como fazer algo ou pedir um passo a passo.

    Args:
        query: descrição do que o usuário quer aprender
    """
    from documents.vectorstore.pgvector_store import hybrid_search

    try:
        results = hybrid_search(query, top_k=4, source_types=["tutorial"])

        if not results:
            # Fallback para busca direta no banco
            from tutorial.models import Tutorial
            from django.db.models import Q
            tutorials = Tutorial.objects.filter(
                Q(title__icontains=query) | Q(description__icontains=query),
                is_active=True,
            )[:5]

            if not tutorials:
                return json.dumps({"found": False, "message": "Nenhum tutorial encontrado."}, ensure_ascii=False)

            return json.dumps({
                "found": True,
                "tutorials": [
                    {"title": t.title, "description": t.description[:200], "sector": t.sector.name if t.sector else None}
                    for t in tutorials
                ],
            }, ensure_ascii=False)

        formatted = [
            {"tutorial": r.document_title, "content": r.content[:600], "relevance": round(r.score, 3)}
            for r in results
        ]
        return json.dumps({"found": True, "tutorials": formatted}, ensure_ascii=False)

    except Exception as e:
        return json.dumps({"found": False, "error": str(e)}, ensure_ascii=False)
