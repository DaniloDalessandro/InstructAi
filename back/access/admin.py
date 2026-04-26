from django.contrib import admin
from django.utils.html import format_html
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = [
        "timestamp", "user_display", "action_badge",
        "content_type_badge", "object_title", "ip_address",
    ]
    list_filter = ["action", "content_type", "timestamp"]
    search_fields = ["user__email", "object_title", "object_id"]
    readonly_fields = [
        "user", "action", "content_type", "object_id",
        "object_title", "details", "ip_address", "timestamp",
    ]
    date_hierarchy = "timestamp"
    ordering = ["-timestamp"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def user_display(self, obj):
        if obj.user:
            return format_html(
                '<span style="font-size:12px">{}</span>', obj.user.email
            )
        return format_html('<span style="color:#8a8f98;font-size:11px">Sistema</span>')
    user_display.short_description = "Usuário"

    def action_badge(self, obj):
        colors = {
            "create": "#10b981",
            "update": "#5e6ad2",
            "delete": "#e5484d",
            "restore": "#f59e0b",
            "grant_admin": "#7170ff",
            "revoke_admin": "#f59e0b",
            "transfer_owner": "#e5484d",
            "unauthorized": "#e5484d",
        }
        color = colors.get(obj.action, "#8a8f98")
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 8px;border-radius:4px;font-size:11px">{}</span>',
            color, obj.get_action_display(),
        )
    action_badge.short_description = "Ação"

    def content_type_badge(self, obj):
        colors = {"manual": "#5e6ad2", "tutorial": "#10b981", "course": "#f59e0b"}
        color = colors.get(obj.content_type, "#8a8f98")
        return format_html(
            '<span style="background:{};color:#fff;padding:1px 7px;border-radius:3px;font-size:11px">{}</span>',
            color, obj.get_content_type_display(),
        )
    content_type_badge.short_description = "Tipo"
