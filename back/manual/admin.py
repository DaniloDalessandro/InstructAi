from django.contrib import admin
from .models import Manual


@admin.action(description='Ativar manuais selecionados')
def ativar_manuais(modeladmin, request, queryset):
    queryset.update(is_active=True)


@admin.action(description='Inativar manuais selecionados')
def inativar_manuais(modeladmin, request, queryset):
    queryset.update(is_active=False)


@admin.register(Manual)
class ManualAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active', 'get_sectors', 'get_tags', 'created_at', 'created_by']
    list_filter = ['is_active', 'sectors', 'tags', 'created_at']
    search_fields = ['name', 'created_by', 'updated_by']
    filter_horizontal = ['sectors', 'tags']
    readonly_fields = ['created_at', 'updated_at', 'created_by', 'updated_by']
    actions = [ativar_manuais, inativar_manuais]

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
