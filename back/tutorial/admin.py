from django.contrib import admin
from django.utils.html import format_html
from .models import Tutorial, TutorialStep, TutorialMedia


class TutorialStepInline(admin.TabularInline):
    """Inline for Tutorial Steps"""
    model = TutorialStep
    extra = 0
    fields = ['order', 'title', 'content']
    ordering = ['order']


class TutorialMediaInline(admin.TabularInline):
    """Inline for Tutorial Media"""
    model = TutorialMedia
    extra = 0
    fields = ['media_type', 'file', 'embed_url', 'order']
    ordering = ['order']


@admin.action(description='🤖 Indexar na base de conhecimento da Alice')
def indexar_tutoriais_alice(modeladmin, request, queryset):
    from documents.tasks import index_tutorial
    count = 0
    for tutorial in queryset:
        index_tutorial.delay(str(tutorial.id))
        count += 1
    modeladmin.message_user(request, f'{count} tutorial(is) enviado(s) para indexação na Alice.')


@admin.action(description='Ativar tutoriais selecionados')
def ativar_tutoriais(modeladmin, request, queryset):
    queryset.update(is_active=True)


@admin.action(description='Inativar tutoriais selecionados')
def inativar_tutoriais(modeladmin, request, queryset):
    queryset.update(is_active=False)


@admin.register(Tutorial)
class TutorialAdmin(admin.ModelAdmin):
    """Admin for Tutorial model"""
    list_display = ['title', 'sector', 'created_by', 'is_active', 'step_count', 'alice_status_badge', 'created_at']
    list_filter = ['sector', 'tags', 'is_active', 'created_at']
    search_fields = ['title', 'description']
    filter_horizontal = ['tags']
    readonly_fields = ['created_by', 'created_at', 'updated_at', 'alice_status_badge']
    inlines = [TutorialStepInline]
    actions = [ativar_tutoriais, inativar_tutoriais, indexar_tutoriais_alice]

    def alice_status_badge(self, obj):
        from documents.models import KnowledgeDocument
        doc = KnowledgeDocument.objects.filter(source_type='tutorial', source_id=str(obj.id)).first()
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
            'fields': ('title', 'description', 'sector', 'tags')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Auditoria', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def step_count(self, obj):
        return obj.steps.count()
    step_count.short_description = 'Passos'

    def save_model(self, request, obj, form, change):
        """Set created_by on creation"""
        if not change:
            obj.created_by = request.user
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(TutorialStep)
class TutorialStepAdmin(admin.ModelAdmin):
    """Admin for TutorialStep model"""
    list_display = ['tutorial', 'order', 'title', 'created_at']
    list_filter = ['tutorial', 'created_at']
    search_fields = ['title', 'content']
    readonly_fields = ['created_at', 'updated_at']
    inlines = [TutorialMediaInline]

    fieldsets = (
        ('Tutorial', {
            'fields': ('tutorial', 'order')
        }),
        ('Conteúdo', {
            'fields': ('title', 'content')
        }),
        ('Auditoria', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(TutorialMedia)
class TutorialMediaAdmin(admin.ModelAdmin):
    """Admin for TutorialMedia model"""
    list_display = ['step', 'media_type', 'order', 'created_at']
    list_filter = ['media_type', 'created_at']
    readonly_fields = ['created_at', 'updated_at']

    fieldsets = (
        ('Passo', {
            'fields': ('step', 'order')
        }),
        ('Mídia', {
            'fields': ('media_type', 'file', 'embed_url', 'caption', 'annotations')
        }),
        ('Auditoria', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
