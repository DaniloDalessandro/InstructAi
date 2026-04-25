from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import pgvector.django


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Enable pgvector extension first
        migrations.RunSQL(
            sql="CREATE EXTENSION IF NOT EXISTS vector;",
            reverse_sql="DROP EXTENSION IF EXISTS vector;",
        ),
        migrations.CreateModel(
            name="KnowledgeDocument",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=500, verbose_name="Título")),
                ("source_type", models.CharField(
                    choices=[
                        ("manual", "Manual"), ("tutorial", "Tutorial"), ("course", "Curso"),
                        ("faq", "FAQ"), ("procedure", "Procedimento"), ("custom", "Personalizado"),
                    ],
                    max_length=30, verbose_name="Tipo de Origem",
                )),
                ("source_id", models.CharField(blank=True, max_length=100, verbose_name="ID da Origem")),
                ("file", models.FileField(blank=True, null=True, upload_to="knowledge/", verbose_name="Arquivo")),
                ("content_text", models.TextField(blank=True, verbose_name="Texto Extraído")),
                ("status", models.CharField(
                    choices=[
                        ("pending", "Pendente"), ("processing", "Processando"),
                        ("indexed", "Indexado"), ("error", "Erro"),
                    ],
                    db_index=True, default="pending", max_length=20, verbose_name="Status",
                )),
                ("error_message", models.TextField(blank=True, verbose_name="Erro")),
                ("chunk_count", models.PositiveIntegerField(default=0, verbose_name="Chunks")),
                ("indexed_at", models.DateTimeField(blank=True, null=True, verbose_name="Indexado em")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Criado em")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="Atualizado em")),
                ("doc_metadata", models.JSONField(blank=True, default=dict, verbose_name="Metadados")),
                ("created_by", models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name="knowledge_documents", to=settings.AUTH_USER_MODEL, verbose_name="Criado por",
                )),
            ],
            options={"verbose_name": "Documento", "verbose_name_plural": "Documentos", "ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="DocumentChunk",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("content", models.TextField(verbose_name="Conteúdo")),
                ("embedding", pgvector.django.VectorField(dimensions=1536, verbose_name="Embedding")),
                ("chunk_index", models.PositiveIntegerField(verbose_name="Índice do Chunk")),
                ("page_number", models.PositiveIntegerField(blank=True, null=True, verbose_name="Página")),
                ("token_count", models.PositiveIntegerField(default=0, verbose_name="Tokens")),
                ("chunk_metadata", models.JSONField(blank=True, default=dict, verbose_name="Metadados")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("document", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE, related_name="chunks",
                    to="documents.knowledgedocument", verbose_name="Documento",
                )),
            ],
            options={"verbose_name": "Chunk", "verbose_name_plural": "Chunks", "ordering": ["document", "chunk_index"]},
        ),
        migrations.CreateModel(
            name="ProcessingLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("level", models.CharField(
                    choices=[("info", "Info"), ("warning", "Warning"), ("error", "Error")],
                    default="info", max_length=10,
                )),
                ("message", models.TextField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("document", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="logs", to="documents.knowledgedocument",
                )),
            ],
            options={"ordering": ["-created_at"], "verbose_name": "Log de Processamento", "verbose_name_plural": "Logs de Processamento"},
        ),
        migrations.AddIndex(
            model_name="knowledgedocument",
            index=models.Index(fields=["source_type", "source_id"], name="docs_source_idx"),
        ),
        migrations.AddIndex(
            model_name="knowledgedocument",
            index=models.Index(fields=["status"], name="docs_status_idx"),
        ),
        migrations.AddIndex(
            model_name="documentchunk",
            index=models.Index(fields=["document", "chunk_index"], name="chunk_doc_idx"),
        ),
    ]
