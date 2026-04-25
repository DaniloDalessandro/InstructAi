from django.contrib import admin
from django.utils.html import format_html
from .models import Manual


@admin.action(description='Ativar manuais selecionados')
def ativar_manuais(modeladmin, request, queryset):
    queryset.update(is_active=True)


@admin.action(description='Inativar manuais selecionados')
def inativar_manuais(modeladmin, request, queryset):
    queryset.update(is_active=False)


@admin.action(description='🤖 Indexar na base de conhecimento da Alice')
def indexar_na_alice(modeladmin, request, queryset):
    from documents.tasks import index_manual
    count = 0
    for manual in queryset:
        index_manual.delay(manual.id)
        count += 1
    modeladmin.message_user(request, f'{count} manual(is) enviado(s) para indexação. Acompanhe em Documentos → Knowledge Base.')


@admin.register(Manual)
class ManualAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active', 'get_sectors', 'get_tags', 'alice_status_badge', 'created_at', 'created_by']
    list_filter = ['is_active', 'sectors', 'tags', 'created_at']
    search_fields = ['name', 'created_by', 'updated_by']
    filter_horizontal = ['sectors', 'tags']
    readonly_fields = ['created_at', 'updated_at', 'created_by', 'updated_by', 'alice_status_badge']
    actions = [ativar_manuais, inativar_manuais, indexar_na_alice]

    def alice_status_badge(self, obj):
        from documents.models import KnowledgeDocument
        doc = KnowledgeDocument.objects.filter(source_type='manual', source_id=str(obj.id)).first()
        if not doc:
            return format_html('<span style="color:#8a8f98;font-size:11px">Não indexado</span>')
        colors = {'indexed': '#10b981', 'processing': '#5e6ad2', 'pending': '#f59e0b', 'error': '#e5484d'}
        labels = {'indexed': '✓ Indexado', 'processing': '⟳ Processando', 'pending': '⏳ Pendente', 'error': '✗ Erro'}
        color = colors.get(doc.status, '#8a8f98')
        label = labels.get(doc.status, doc.status)
        extra = f' ({doc.chunk_count} chunks)' if doc.status == 'indexed' else ''
        return format_html('<span style="color:{};font-size:11px;font-weight:500">{}{}</span>', color, label, extra)
    alice_status_badge.short_description = 'Alice'

    fieldsets = (
        ('Informações Básicas', {
            'fields': ('name', 'pdf_file', 'is_active')
        }),
        ('Categorização', {
            'fields': ('sectors', 'tags')
        }),
        ('Auditoria', {
            'fields': ('created_at', 'updated_at', 'created_by', 'updated_by'),
            'classes': ('collapse',)
        }),
    )

    def get_sectors(self, obj):
        return ", ".join([sector.name for sector in obj.sectors.all()])
    get_sectors.short_description = 'Setores'

    def get_tags(self, obj):
        return ", ".join([tag.name for tag in obj.tags.all()])
    get_tags.short_description = 'Tags'

    def save_model(self, request, obj, form, change):
        if not change:  # Se está criando um novo objeto
            obj.created_by = request.user.email
        obj.updated_by = request.user.email
        super().save_model(request, obj, form, change)
