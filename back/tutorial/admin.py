from django.contrib import admin
from .models import KnowledgeArea, TutorialTag, Tutorial, TutorialStep, TutorialMedia


class TutorialStepInline(admin.TabularInline):
    """Inline admin for tutorial steps"""
    model = TutorialStep
    extra = 1
    fields = ['order', 'title', 'content']
    ordering = ['order']


class TutorialMediaInline(admin.TabularInline):
    """Inline admin for step media"""
    model = TutorialMedia
    extra = 0
    fields = ['media_type', 'file', 'embed_url', 'caption', 'order']
    ordering = ['order']


@admin.register(KnowledgeArea)
class KnowledgeAreaAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_at', 'updated_at']
    search_fields = ['name', 'description']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(TutorialTag)
class TutorialTagAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_at']
    search_fields = ['name']
    readonly_fields = ['id', 'created_at']


@admin.register(Tutorial)
class TutorialAdmin(admin.ModelAdmin):
    list_display = ['title', 'author', 'knowledge_area', 'difficulty_level', 'is_published', 'created_at']
    list_filter = ['is_published', 'difficulty_level', 'knowledge_area', 'created_at']
    search_fields = ['title', 'description', 'author__email', 'author__name']
    readonly_fields = ['id', 'created_at', 'updated_at', 'published_at', 'step_count']
    filter_horizontal = ['tags']
    inlines = [TutorialStepInline]

    fieldsets = (
        ('Informações Básicas', {
            'fields': ('id', 'title', 'description', 'author')
        }),
        ('Categorização', {
            'fields': ('knowledge_area', 'tags', 'difficulty_level', 'estimated_time')
        }),
        ('Publicação', {
            'fields': ('is_published', 'published_at')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'step_count'),
            'classes': ('collapse',)
        }),
    )

    def step_count(self, obj):
        """Display the number of steps"""
        return obj.step_count
    step_count.short_description = 'Número de Passos'

    actions = ['publish_tutorials', 'unpublish_tutorials']

    def publish_tutorials(self, request, queryset):
        """Bulk publish tutorials"""
        for tutorial in queryset:
            tutorial.publish()
        self.message_user(request, f'{queryset.count()} tutorial(s) publicado(s) com sucesso.')
    publish_tutorials.short_description = 'Publicar tutoriais selecionados'

    def unpublish_tutorials(self, request, queryset):
        """Bulk unpublish tutorials"""
        for tutorial in queryset:
            tutorial.unpublish()
        self.message_user(request, f'{queryset.count()} tutorial(s) despublicado(s) com sucesso.')
    unpublish_tutorials.short_description = 'Despublicar tutoriais selecionados'


@admin.register(TutorialStep)
class TutorialStepAdmin(admin.ModelAdmin):
    list_display = ['tutorial', 'order', 'title', 'created_at']
    list_filter = ['tutorial', 'created_at']
    search_fields = ['title', 'content', 'tutorial__title']
    readonly_fields = ['id', 'created_at', 'updated_at']
    inlines = [TutorialMediaInline]

    fieldsets = (
        ('Informações do Passo', {
            'fields': ('id', 'tutorial', 'order', 'title', 'content')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(TutorialMedia)
class TutorialMediaAdmin(admin.ModelAdmin):
    list_display = ['step', 'media_type', 'order', 'created_at']
    list_filter = ['media_type', 'created_at']
    search_fields = ['step__title', 'caption']
    readonly_fields = ['id', 'created_at', 'updated_at']

    fieldsets = (
        ('Informações da Mídia', {
            'fields': ('id', 'step', 'media_type', 'order')
        }),
        ('Arquivo/URL', {
            'fields': ('file', 'embed_url', 'caption')
        }),
        ('Anotações', {
            'fields': ('annotations',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
