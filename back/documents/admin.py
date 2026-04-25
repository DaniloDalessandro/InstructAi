from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.urls import path
from django.http import HttpResponseRedirect
from django.contrib import messages
from .models import KnowledgeDocument, DocumentChunk, ProcessingLog


# ────────────────────────────────────────────────────────────
# Inlines
# ────────────────────────────────────────────────────────────

class ProcessingLogInline(admin.TabularInline):
    model = ProcessingLog
    extra = 0
    readonly_fields = ["level_badge", "message", "created_at"]
    fields = ["level_badge", "message", "created_at"]
    can_delete = False
    max_num = 30
    ordering = ["-created_at"]

    def level_badge(self, obj):
        colors = {"info": "#5e6ad2", "warning": "#f59e0b", "error": "#e5484d"}
        color = colors.get(obj.level, "#8a8f98")
        return format_html(
            '<span style="background:{};color:#fff;padding:1px 7px;border-radius:3px;font-size:10px;font-weight:600">{}</span>',
            color, obj.level.upper(),
        )
    level_badge.short_description = "Nível"


class DocumentChunkInline(admin.TabularInline):
    model = DocumentChunk
    extra = 0
    readonly_fields = ["chunk_index", "page_number", "token_count", "content_preview"]
    fields = ["chunk_index", "page_number", "token_count", "content_preview"]
    can_delete = False
    max_num = 15
    verbose_name = "Chunk indexado"
    verbose_name_plural = "Chunks indexados"

    def content_preview(self, obj):
        return obj.content[:130] + "…" if len(obj.content) > 130 else obj.content
    content_preview.short_description = "Conteúdo (preview)"


# ────────────────────────────────────────────────────────────
# Actions
# ────────────────────────────────────────────────────────────

@admin.action(description="⟳ Reprocessar documentos selecionados")
def reprocessar_selecionados(modeladmin, request, queryset):
    from .tasks import reprocess_document
    count = 0
    for doc in queryset:
        reprocess_document.delay(doc.id)
        count += 1
    modeladmin.message_user(request, f"{count} documento(s) enviado(s) para reprocessamento.")


@admin.action(description="🗑️ Limpar chunks dos documentos selecionados")
def limpar_chunks(modeladmin, request, queryset):
    total = 0
    for doc in queryset:
        deleted, _ = DocumentChunk.objects.filter(document=doc).delete()
        total += deleted
        doc.chunk_count = 0
        doc.status = "pending"
        doc.indexed_at = None
        doc.save(update_fields=["chunk_count", "status", "indexed_at", "updated_at"])
    modeladmin.message_user(request, f"{total} chunk(s) removido(s). Documentos marcados como pendentes.")


# ────────────────────────────────────────────────────────────
# KnowledgeDocument Admin
# ────────────────────────────────────────────────────────────

@admin.register(KnowledgeDocument)
class KnowledgeDocumentAdmin(admin.ModelAdmin):
    list_display = [
        "title", "source_type_badge", "status_badge",
        "chunk_count", "indexed_at", "created_at",
    ]
    list_filter = ["status", "source_type", "created_at"]
    search_fields = ["title", "source_id"]
    readonly_fields = [
        "status_badge", "source_type_badge", "chunk_count",
        "indexed_at", "created_at", "updated_at", "error_message",
    ]
    actions = [reprocessar_selecionados, limpar_chunks]
    inlines = [DocumentChunkInline, ProcessingLogInline]

    fieldsets = (
        ("Documento", {
            "fields": ("title", "source_type_badge", "source_id", "file", "content_text"),
        }),
        ("Status da Indexação", {
            "fields": ("status_badge", "chunk_count", "indexed_at", "error_message"),
        }),
        ("Metadados", {
            "fields": ("doc_metadata", "created_by", "created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )

    def get_urls(self):
        urls = super().get_urls()
        custom = [
            path("indexar-tudo/", self.admin_site.admin_view(self.indexar_tudo_view), name="documents-indexar-tudo"),
            path("indexar-pendentes/", self.admin_site.admin_view(self.indexar_pendentes_view), name="documents-indexar-pendentes"),
        ]
        return custom + urls

    def indexar_tudo_view(self, request):
        """Reindexar TODOS os conteúdos da plataforma."""
        from documents.tasks import index_manual, index_tutorial, index_course
        from manual.models import Manual
        from tutorial.models import Tutorial
        from courses.models import Course

        total = 0
        for m in Manual.objects.filter(is_active=True):
            index_manual.delay(m.id)
            total += 1
        for t in Tutorial.objects.filter(is_active=True):
            index_tutorial.delay(str(t.id))
            total += 1
        for c in Course.objects.filter(is_active=True):
            index_course.delay(c.id)
            total += 1

        self.message_user(request, f"{total} item(s) enviado(s) para indexação completa.")
        return HttpResponseRedirect("../")

    def indexar_pendentes_view(self, request):
        """Reprocessar documentos com status pending ou error."""
        from documents.tasks import process_document
        qs = KnowledgeDocument.objects.filter(status__in=["pending", "error"])
        count = 0
        for doc in qs:
            process_document.delay(doc.id)
            count += 1
        self.message_user(request, f"{count} documento(s) pendente(s)/com erro enviado(s) para reprocessamento.")
        return HttpResponseRedirect("../")

    def changelist_view(self, request, extra_context=None):
        """Adiciona botões de ação global ao topo da listagem."""
        from documents.models import KnowledgeDocument as KD
        extra_context = extra_context or {}

        counts = {
            "total": KD.objects.count(),
            "indexed": KD.objects.filter(status="indexed").count(),
            "pending": KD.objects.filter(status__in=["pending", "error"]).count(),
            "processing": KD.objects.filter(status="processing").count(),
            "chunks": DocumentChunk.objects.count(),
        }
        extra_context["alice_stats"] = counts
        return super().changelist_view(request, extra_context=extra_context)

    def source_type_badge(self, obj):
        colors = {
            "manual": "#5e6ad2", "tutorial": "#10b981", "course": "#f59e0b",
            "faq": "#7170ff", "procedure": "#e5484d", "custom": "#8a8f98",
        }
        color = colors.get(obj.source_type, "#8a8f98")
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 8px;border-radius:4px;font-size:11px">{}</span>',
            color, obj.get_source_type_display(),
        )
    source_type_badge.short_description = "Tipo"

    def status_badge(self, obj):
        colors = {
            "pending": "#f59e0b", "processing": "#5e6ad2",
            "indexed": "#10b981", "error": "#e5484d",
        }
        icons = {"pending": "⏳", "processing": "⟳", "indexed": "✓", "error": "✗"}
        color = colors.get(obj.status, "#8a8f98")
        icon = icons.get(obj.status, "")
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 8px;border-radius:4px;font-size:11px">{} {}</span>',
            color, icon, obj.get_status_display(),
        )
    status_badge.short_description = "Status"


# ────────────────────────────────────────────────────────────
# ProcessingLog Admin
# ────────────────────────────────────────────────────────────

@admin.register(ProcessingLog)
class ProcessingLogAdmin(admin.ModelAdmin):
    list_display = ["document", "level_badge", "message_preview", "created_at"]
    list_filter = ["level", "created_at"]
    search_fields = ["message", "document__title"]
    readonly_fields = ["document", "level", "message", "created_at"]

    def level_badge(self, obj):
        colors = {"info": "#5e6ad2", "warning": "#f59e0b", "error": "#e5484d"}
        color = colors.get(obj.level, "#8a8f98")
        return format_html(
            '<span style="background:{};color:#fff;padding:1px 7px;border-radius:3px;font-size:10px;font-weight:600">{}</span>',
            color, obj.level.upper(),
        )
    level_badge.short_description = "Nível"

    def message_preview(self, obj):
        return obj.message[:100]
    message_preview.short_description = "Mensagem"
