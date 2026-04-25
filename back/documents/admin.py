from django.contrib import admin
from django.utils.html import format_html
from .models import KnowledgeDocument, DocumentChunk, ProcessingLog


class ProcessingLogInline(admin.TabularInline):
    model = ProcessingLog
    extra = 0
    readonly_fields = ["level", "message", "created_at"]
    can_delete = False
    max_num = 20
    ordering = ["-created_at"]


class DocumentChunkInline(admin.TabularInline):
    model = DocumentChunk
    extra = 0
    readonly_fields = ["chunk_index", "page_number", "token_count", "content_preview"]
    fields = ["chunk_index", "page_number", "token_count", "content_preview"]
    can_delete = False
    max_num = 10

    def content_preview(self, obj):
        return obj.content[:120] + "…" if len(obj.content) > 120 else obj.content
    content_preview.short_description = "Conteúdo (preview)"


@admin.register(KnowledgeDocument)
class KnowledgeDocumentAdmin(admin.ModelAdmin):
    list_display = [
        "title", "source_type_badge", "status_badge",
        "chunk_count", "indexed_at", "created_at",
    ]
    list_filter = ["status", "source_type", "created_at"]
    search_fields = ["title", "source_id"]
    readonly_fields = [
        "status", "chunk_count", "indexed_at", "created_at", "updated_at", "error_message",
    ]
    inlines = [ProcessingLogInline, DocumentChunkInline]
    actions = ["reprocess_selected"]

    def source_type_badge(self, obj):
        colors = {
            "manual": "#5e6ad2",
            "tutorial": "#10b981",
            "course": "#f59e0b",
            "faq": "#7170ff",
            "procedure": "#e5484d",
            "custom": "#8a8f98",
        }
        color = colors.get(obj.source_type, "#8a8f98")
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 8px;border-radius:4px;font-size:11px">{}</span>',
            color, obj.get_source_type_display(),
        )
    source_type_badge.short_description = "Tipo"

    def status_badge(self, obj):
        colors = {
            "pending": "#f59e0b",
            "processing": "#5e6ad2",
            "indexed": "#10b981",
            "error": "#e5484d",
        }
        color = colors.get(obj.status, "#8a8f98")
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 8px;border-radius:4px;font-size:11px">{}</span>',
            color, obj.get_status_display(),
        )
    status_badge.short_description = "Status"

    def reprocess_selected(self, request, queryset):
        from .tasks import reprocess_document
        count = 0
        for doc in queryset:
            reprocess_document.delay(doc.id)
            count += 1
        self.message_user(request, f"{count} documento(s) enviado(s) para reprocessamento.")
    reprocess_selected.short_description = "Reprocessar documentos selecionados"


@admin.register(ProcessingLog)
class ProcessingLogAdmin(admin.ModelAdmin):
    list_display = ["document", "level", "message_preview", "created_at"]
    list_filter = ["level", "created_at"]
    search_fields = ["message", "document__title"]

    def message_preview(self, obj):
        return obj.message[:100]
    message_preview.short_description = "Mensagem"
