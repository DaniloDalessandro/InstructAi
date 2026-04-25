from django.db import models
from django.conf import settings
from pgvector.django import VectorField


class KnowledgeDocument(models.Model):
    """Representa um documento indexado na base de conhecimento da Alice."""

    SOURCE_TYPE_CHOICES = [
        ("manual", "Manual"),
        ("tutorial", "Tutorial"),
        ("course", "Curso"),
        ("faq", "FAQ"),
        ("procedure", "Procedimento"),
        ("custom", "Personalizado"),
    ]
    STATUS_CHOICES = [
        ("pending", "Pendente"),
        ("processing", "Processando"),
        ("indexed", "Indexado"),
        ("error", "Erro"),
    ]

    title = models.CharField(max_length=500, verbose_name="Título")
    source_type = models.CharField(
        max_length=30,
        choices=SOURCE_TYPE_CHOICES,
        verbose_name="Tipo de Origem",
    )
    source_id = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="ID da Origem",
        help_text="ID do objeto original (manual, tutorial, curso…)",
    )
    file = models.FileField(
        upload_to="knowledge/",
        null=True,
        blank=True,
        verbose_name="Arquivo",
    )
    content_text = models.TextField(
        blank=True,
        verbose_name="Texto Extraído",
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending",
        verbose_name="Status",
        db_index=True,
    )
    error_message = models.TextField(blank=True, verbose_name="Erro")
    chunk_count = models.PositiveIntegerField(default=0, verbose_name="Chunks")
    indexed_at = models.DateTimeField(null=True, blank=True, verbose_name="Indexado em")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="knowledge_documents",
        verbose_name="Criado por",
    )
    doc_metadata = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Metadados",
    )

    class Meta:
        verbose_name = "Documento"
        verbose_name_plural = "Documentos"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["source_type", "source_id"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"[{self.get_source_type_display()}] {self.title}"


class DocumentChunk(models.Model):
    """Fragmento de texto indexado com embedding vetorial."""

    document = models.ForeignKey(
        KnowledgeDocument,
        on_delete=models.CASCADE,
        related_name="chunks",
        verbose_name="Documento",
    )
    content = models.TextField(verbose_name="Conteúdo")
    embedding = VectorField(dimensions=1536, verbose_name="Embedding")
    chunk_index = models.PositiveIntegerField(verbose_name="Índice do Chunk")
    page_number = models.PositiveIntegerField(
        null=True, blank=True, verbose_name="Página"
    )
    token_count = models.PositiveIntegerField(default=0, verbose_name="Tokens")
    chunk_metadata = models.JSONField(
        default=dict, blank=True, verbose_name="Metadados"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Chunk"
        verbose_name_plural = "Chunks"
        ordering = ["document", "chunk_index"]
        indexes = [
            models.Index(fields=["document", "chunk_index"]),
        ]

    def __str__(self):
        return f"{self.document.title} — chunk {self.chunk_index}"


class ProcessingLog(models.Model):
    """Log de cada tentativa de processamento de documento."""

    document = models.ForeignKey(
        KnowledgeDocument,
        on_delete=models.CASCADE,
        related_name="logs",
    )
    level = models.CharField(
        max_length=10,
        choices=[("info", "Info"), ("warning", "Warning"), ("error", "Error")],
        default="info",
    )
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Log de Processamento"
        verbose_name_plural = "Logs de Processamento"

    def __str__(self):
        return f"[{self.level.upper()}] {self.document.title} — {self.created_at:%d/%m/%Y %H:%M}"
