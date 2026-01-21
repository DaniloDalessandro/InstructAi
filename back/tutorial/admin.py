from django.contrib import admin
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


@admin.register(Tutorial)
class TutorialAdmin(admin.ModelAdmin):
    """Admin for Tutorial model"""
    list_display = ['title', 'sector', 'created_by', 'is_active', 'step_count', 'created_at']
    list_filter = ['sector', 'tags', 'is_active', 'created_at']
    search_fields = ['title', 'description']
    filter_horizontal = ['tags']
    readonly_fields = ['created_by', 'created_at', 'updated_at', 'step_count']
    inlines = [TutorialStepInline]

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
