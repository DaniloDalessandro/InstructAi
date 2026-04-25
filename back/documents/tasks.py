"""
Tarefas Celery para processamento assíncrono de documentos.

Fluxo:
  1. Recebe document_id
  2. Extrai texto (PDF ou texto direto)
  3. Divide em chunks inteligentes
  4. Gera embeddings via OpenAI
  5. Salva no PGVector
  6. Atualiza status do documento
"""
from __future__ import annotations

import logging
from django.utils import timezone
from celery import shared_task

logger = logging.getLogger(__name__)


def _log(doc, level: str, message: str):
    from documents.models import ProcessingLog
    ProcessingLog.objects.create(document=doc, level=level, message=message)
    getattr(logger, level if level != "error" else "error")(
        "[doc:%d] %s", doc.id, message
    )


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    queue="documents",
    name="documents.tasks.process_document",
)
def process_document(self, document_id: int):
    """
    Task principal: processa e indexa um KnowledgeDocument.
    Faz retry automático em caso de falha (max 3x).
    """
    from documents.models import KnowledgeDocument
    from documents.loaders.pdf_loader import load_pdf_bytes
    from documents.chunkers.text_chunker import split_pages, split_text
    from documents.vectorstore.pgvector_store import save_chunks_with_embeddings
    from django.conf import settings

    if not settings.OPENAI_API_KEY:
        logger.warning("OPENAI_API_KEY não configurada — indexação ignorada.")
        return

    try:
        doc = KnowledgeDocument.objects.get(id=document_id)
    except KnowledgeDocument.DoesNotExist:
        logger.error("Documento %d não encontrado.", document_id)
        return

    # Atualiza status para processando
    doc.status = "processing"
    doc.error_message = ""
    doc.save(update_fields=["status", "error_message", "updated_at"])
    _log(doc, "info", "Iniciando processamento.")

    try:
        chunks = []

        # ── Caso 1: PDF ────────────────────────────────────────
        if doc.file and doc.file.name.lower().endswith(".pdf"):
            _log(doc, "info", f"Extraindo texto do PDF: {doc.file.name}")
            file_bytes = doc.file.read()
            pages = load_pdf_bytes(file_bytes)
            total_chars = sum(p.char_count for p in pages)
            _log(doc, "info", f"Extraídas {len(pages)} páginas, {total_chars} chars.")

            # Salva texto extraído no modelo
            full_text = "\n\n".join(p.text for p in pages)
            doc.content_text = full_text
            doc.save(update_fields=["content_text", "updated_at"])

            chunks = split_pages(
                pages,
                source_title=doc.title,
                source_type=doc.source_type,
            )

        # ── Caso 2: Texto direto (tutorial, curso, etc.) ───────
        elif doc.content_text:
            _log(doc, "info", "Dividindo texto em chunks.")
            chunks = split_text(
                doc.content_text,
                source_title=doc.title,
                source_type=doc.source_type,
            )

        else:
            _log(doc, "warning", "Documento sem conteúdo para indexar.")
            doc.status = "error"
            doc.error_message = "Sem conteúdo para indexar."
            doc.save(update_fields=["status", "error_message", "updated_at"])
            return

        if not chunks:
            _log(doc, "warning", "Nenhum chunk gerado após divisão do texto.")
            doc.status = "error"
            doc.error_message = "Nenhum chunk gerado."
            doc.save(update_fields=["status", "error_message", "updated_at"])
            return

        _log(doc, "info", f"Gerados {len(chunks)} chunks. Gerando embeddings…")

        # ── Gera embeddings e salva no PGVector ────────────────
        count = save_chunks_with_embeddings(document_id=doc.id, chunks=chunks)

        doc.status = "indexed"
        doc.chunk_count = count
        doc.indexed_at = timezone.now()
        doc.error_message = ""
        doc.save(update_fields=["status", "chunk_count", "indexed_at", "error_message", "updated_at"])

        _log(doc, "info", f"Indexação concluída: {count} chunks salvos.")

    except Exception as exc:
        _log(doc, "error", f"Falha no processamento: {exc}")
        doc.status = "error"
        doc.error_message = str(exc)
        doc.save(update_fields=["status", "error_message", "updated_at"])

        # Retry automático com back-off
        raise self.retry(exc=exc, countdown=60 * (self.request.retries + 1))


@shared_task(queue="documents", name="documents.tasks.reprocess_document")
def reprocess_document(document_id: int):
    """Força reprocessamento de um documento (limpa chunks existentes)."""
    from documents.models import KnowledgeDocument, DocumentChunk
    try:
        doc = KnowledgeDocument.objects.get(id=document_id)
        DocumentChunk.objects.filter(document=doc).delete()
        doc.status = "pending"
        doc.chunk_count = 0
        doc.indexed_at = None
        doc.save(update_fields=["status", "chunk_count", "indexed_at", "updated_at"])
        process_document.delay(document_id)
    except KnowledgeDocument.DoesNotExist:
        logger.error("Documento %d não encontrado para reprocessamento.", document_id)


@shared_task(queue="documents", name="documents.tasks.index_manual")
def index_manual(manual_id: int):
    """Indexa ou atualiza um manual na base de conhecimento."""
    from manual.models import Manual
    from documents.models import KnowledgeDocument, DocumentChunk
    from django.conf import settings

    if not settings.OPENAI_API_KEY:
        return

    try:
        manual = Manual.objects.get(id=manual_id)
    except Manual.DoesNotExist:
        return

    # Upsert do KnowledgeDocument
    doc, created = KnowledgeDocument.objects.get_or_create(
        source_type="manual",
        source_id=str(manual_id),
        defaults={
            "title": manual.name,
            "status": "pending",
            "doc_metadata": {
                "sectors": [s.name for s in manual.sectors.all()],
                "tags": [t.name for t in manual.tags.all()],
            },
        },
    )

    if not created:
        # Atualiza metadados e reseta para reprocessar
        doc.title = manual.name
        doc.status = "pending"
        doc.doc_metadata = {
            "sectors": [s.name for s in manual.sectors.all()],
            "tags": [t.name for t in manual.tags.all()],
        }
        doc.save(update_fields=["title", "status", "doc_metadata", "updated_at"])
        DocumentChunk.objects.filter(document=doc).delete()

    # Copia o arquivo do manual para o KnowledgeDocument
    if manual.pdf_file:
        doc.file = manual.pdf_file
        doc.save(update_fields=["file", "updated_at"])

    process_document.delay(doc.id)


@shared_task(queue="documents", name="documents.tasks.index_tutorial")
def index_tutorial(tutorial_id: str):
    """Indexa ou atualiza um tutorial (com todos os seus passos)."""
    from tutorial.models import Tutorial
    from documents.models import KnowledgeDocument, DocumentChunk
    from django.conf import settings

    if not settings.OPENAI_API_KEY:
        return

    try:
        tutorial = Tutorial.objects.prefetch_related("steps", "tags").get(id=tutorial_id)
    except Tutorial.DoesNotExist:
        return

    # Monta texto completo do tutorial
    lines = [f"# {tutorial.title}", tutorial.description, ""]
    for step in tutorial.steps.order_by("order"):
        lines.append(f"## Passo {step.order}: {step.title}")
        lines.append(step.content)
        lines.append("")
    full_text = "\n".join(lines)

    doc, created = KnowledgeDocument.objects.get_or_create(
        source_type="tutorial",
        source_id=str(tutorial_id),
        defaults={
            "title": tutorial.title,
            "content_text": full_text,
            "status": "pending",
            "doc_metadata": {
                "sector": tutorial.sector.name if tutorial.sector else None,
                "tags": [t.name for t in tutorial.tags.all()],
            },
        },
    )

    if not created:
        doc.title = tutorial.title
        doc.content_text = full_text
        doc.status = "pending"
        doc.save(update_fields=["title", "content_text", "status", "updated_at"])
        DocumentChunk.objects.filter(document=doc).delete()

    process_document.delay(doc.id)


@shared_task(queue="documents", name="documents.tasks.index_course")
def index_course(course_id: int):
    """Indexa ou atualiza um curso."""
    from courses.models import Course
    from documents.models import KnowledgeDocument, DocumentChunk
    from django.conf import settings

    if not settings.OPENAI_API_KEY:
        return

    try:
        course = Course.objects.prefetch_related("tags").get(id=course_id)
    except Course.DoesNotExist:
        return

    # Tenta importar módulos/aulas se existirem
    full_text = f"# {course.name}\n\n{course.description}\n"
    try:
        from courses.models import Module
        for module in Module.objects.filter(course=course).order_by("order"):
            full_text += f"\n## Módulo: {module.title}\n{module.description or ''}\n"
    except Exception:
        pass

    doc, created = KnowledgeDocument.objects.get_or_create(
        source_type="course",
        source_id=str(course_id),
        defaults={
            "title": course.name,
            "content_text": full_text,
            "status": "pending",
            "doc_metadata": {
                "sector": course.sector.name if hasattr(course, "sector") and course.sector else None,
                "tags": [t.name for t in course.tags.all()],
                "workload_hours": getattr(course, "workload_hours", 0),
            },
        },
    )

    if not created:
        doc.title = course.name
        doc.content_text = full_text
        doc.status = "pending"
        doc.save(update_fields=["title", "content_text", "status", "updated_at"])
        DocumentChunk.objects.filter(document=doc).delete()

    process_document.delay(doc.id)
