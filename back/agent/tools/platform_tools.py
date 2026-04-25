"""
Tools de consulta direta ao banco de dados da plataforma.
"""
from __future__ import annotations

import json
from langchain_core.tools import tool


@tool
def get_platform_stats() -> str:
    """
    Retorna estatísticas gerais da plataforma InstructAI:
    número de tutoriais, manuais, cursos, setores, usuários e documentos indexados.
    Use quando o usuário pedir resumo, dashboard ou visão geral da plataforma.
    """
    try:
        from tutorial.models import Tutorial
        from manual.models import Manual
        from courses.models import Course
        from sectors.models import Sector
        from tags.models import Tag
        from documents.models import KnowledgeDocument

        result = {
            "tutoriais_total": Tutorial.objects.count(),
            "tutoriais_ativos": Tutorial.objects.filter(is_active=True).count(),
            "manuais_total": Manual.objects.count(),
            "manuais_ativos": Manual.objects.filter(is_active=True).count(),
            "cursos_total": Course.objects.count(),
            "cursos_ativos": Course.objects.filter(is_active=True).count(),
            "setores": Sector.objects.count(),
            "tags": Tag.objects.count(),
            "documentos_indexados": KnowledgeDocument.objects.filter(status="indexed").count(),
            "documentos_pendentes": KnowledgeDocument.objects.filter(status__in=["pending", "processing"]).count(),
        }
        return json.dumps(result, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"error": str(e)}, ensure_ascii=False)


@tool
def list_courses(query: str = "") -> str:
    """
    Lista cursos disponíveis na plataforma.
    Use quando o usuário perguntar sobre cursos, treinamentos ou trilhas de aprendizado.

    Args:
        query: filtro opcional por nome do curso
    """
    try:
        from courses.models import Course
        qs = Course.objects.prefetch_related("tags").filter(is_active=True)
        if query:
            qs = qs.filter(name__icontains=query)
        courses = [
            {
                "nome": c.name,
                "descricao": (c.description or "")[:200],
                "setor": c.sector.name if hasattr(c, "sector") and c.sector else None,
                "carga_horaria": getattr(c, "workload_hours", 0),
                "tem_prova": getattr(c, "has_final_exam", False),
                "tags": [t.name for t in c.tags.all()],
            }
            for c in qs[:10]
        ]
        return json.dumps({"total": len(courses), "cursos": courses}, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"error": str(e)}, ensure_ascii=False)


@tool
def list_tutorials(sector: str = "", tag: str = "") -> str:
    """
    Lista tutoriais disponíveis, com filtro opcional por setor ou tag.
    Use quando o usuário quiser ver tutoriais disponíveis ou de um setor específico.

    Args:
        sector: filtra por nome do setor (opcional)
        tag: filtra por nome da tag (opcional)
    """
    try:
        from tutorial.models import Tutorial
        from django.db.models import Q

        qs = Tutorial.objects.select_related("sector").prefetch_related("tags").filter(is_active=True)
        if sector:
            qs = qs.filter(sector__name__icontains=sector)
        if tag:
            qs = qs.filter(tags__name__icontains=tag)

        tutorials = [
            {
                "titulo": t.title,
                "descricao": t.description[:150],
                "setor": t.sector.name if t.sector else None,
                "passos": t.steps.count(),
                "tags": [tg.name for tg in t.tags.all()],
            }
            for t in qs[:10]
        ]
        return json.dumps({"total": len(tutorials), "tutoriais": tutorials}, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"error": str(e)}, ensure_ascii=False)


@tool
def list_manuals(sector: str = "") -> str:
    """
    Lista manuais disponíveis na plataforma.
    Use quando o usuário perguntar quais manuais existem ou pedir lista de documentos.

    Args:
        sector: filtra por nome do setor (opcional)
    """
    try:
        from manual.models import Manual
        qs = Manual.objects.prefetch_related("sectors", "tags").filter(is_active=True)
        if sector:
            qs = qs.filter(sectors__name__icontains=sector)

        manuals = [
            {
                "nome": m.name,
                "setores": [s.name for s in m.sectors.all()],
                "tags": [t.name for t in m.tags.all()],
                "criado_em": m.created_at.strftime("%d/%m/%Y"),
            }
            for m in qs[:10]
        ]
        return json.dumps({"total": len(manuals), "manuais": manuals}, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"error": str(e)}, ensure_ascii=False)


@tool
def list_sectors() -> str:
    """
    Lista todos os setores cadastrados na plataforma.
    Use quando o usuário perguntar sobre setores ou departamentos.
    """
    try:
        from sectors.models import Sector
        sectors = list(Sector.objects.values_list("name", flat=True).order_by("name"))
        return json.dumps({"setores": sectors}, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"error": str(e)}, ensure_ascii=False)


@tool
def get_recent_content(days: int = 7) -> str:
    """
    Lista conteúdos criados ou atualizados recentemente.
    Use quando o usuário perguntar sobre novidades ou conteúdo recente.

    Args:
        days: número de dias para considerar como "recente" (padrão: 7)
    """
    try:
        from django.utils import timezone
        from datetime import timedelta
        from tutorial.models import Tutorial
        from manual.models import Manual
        from courses.models import Course

        since = timezone.now() - timedelta(days=days)
        result = {
            "tutoriais_recentes": list(
                Tutorial.objects.filter(created_at__gte=since, is_active=True)
                .values("title", "created_at")[:5]
            ),
            "manuais_recentes": list(
                Manual.objects.filter(created_at__gte=since, is_active=True)
                .values("name", "created_at")[:5]
            ),
            "cursos_recentes": list(
                Course.objects.filter(created_at__gte=since, is_active=True)
                .values("name", "created_at")[:5]
            ),
        }
        # Formata datas
        for key in result:
            for item in result[key]:
                if "created_at" in item and item["created_at"]:
                    item["created_at"] = item["created_at"].strftime("%d/%m/%Y")
        return json.dumps(result, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"error": str(e)}, ensure_ascii=False)
