import json

from django.contrib import admin
from django.utils.html import format_html
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = [
        "timestamp", "user_display", "action_badge",
        "content_type_badge", "object_title_short", "ip_address",
    ]
    list_filter = ["action", "content_type", "timestamp"]
    search_fields = ["user__email", "user__name", "object_title", "object_id", "ip_address"]
    readonly_fields = [
        "timestamp", "user", "action", "content_type",
        "object_id", "object_title", "ip_address", "details_pretty",
    ]
    exclude = ["details"]
    date_hierarchy = "timestamp"
    ordering = ["-timestamp"]
    list_per_page = 50
    show_full_result_count = False

    fieldsets = (
        ("Identificação", {
            "fields": ("timestamp", "user", "ip_address"),
        }),
        ("Ação", {
            "fields": ("action", "content_type", "object_id", "object_title"),
        }),
        ("Detalhes", {
            "fields": ("details_pretty",),
            "classes": ("collapse",),
        }),
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    # ── Colunas da listagem ───────────────────────────────────

    def user_display(self, obj):
        if obj.user:
            return format_html(
                '<span style="font-size:12px;font-weight:500">{}</span>'
                '<br><span style="font-size:11px;color:#8a8f98">{}</span>',
                obj.user.name or obj.user.email,
                obj.user.email,
            )
        return format_html('<span style="color:#8a8f98;font-size:11px">— Sistema —</span>')
    user_display.short_description = "Usuário"
    user_display.admin_order_field = "user__email"

    def action_badge(self, obj):
        colors = {
            "create":         ("#10b981", "#fff"),
            "update":         ("#5e6ad2", "#fff"),
            "delete":         ("#e5484d", "#fff"),
            "restore":        ("#f59e0b", "#fff"),
            "grant_admin":    ("#7170ff", "#fff"),
            "revoke_admin":   ("#f59e0b", "#fff"),
            "transfer_owner": ("#e5484d", "#fff"),
            "unauthorized":   ("#dc2626", "#fff"),
        }
        bg, fg = colors.get(obj.action, ("#8a8f98", "#fff"))
        return format_html(
            '<span style="background:{};color:{};padding:2px 9px;border-radius:4px;'
            'font-size:11px;font-weight:600;letter-spacing:.3px">{}</span>',
            bg, fg, obj.get_action_display(),
        )
    action_badge.short_description = "Ação"
    action_badge.admin_order_field = "action"

    def content_type_badge(self, obj):
        colors = {
            "manual":   "#5e6ad2",
            "tutorial": "#10b981",
            "course":   "#f59e0b",
            "other":    "#8a8f98",
        }
        color = colors.get(obj.content_type, "#8a8f98")
        return format_html(
            '<span style="background:{};color:#fff;padding:1px 8px;border-radius:3px;font-size:11px">{}</span>',
            color, obj.get_content_type_display(),
        )
    content_type_badge.short_description = "Tipo"
    content_type_badge.admin_order_field = "content_type"

    def object_title_short(self, obj):
        title = obj.object_title or obj.object_id or "—"
        if len(title) > 60:
            title = title[:57] + "..."
        return format_html('<span style="font-size:12px">{}</span>', title)
    object_title_short.short_description = "Objeto"
    object_title_short.admin_order_field = "object_title"

    def details_pretty(self, obj):
        if not obj.details:
            return format_html('<span style="color:#8a8f98">Sem detalhes</span>')
        try:
            formatted = json.dumps(obj.details, ensure_ascii=False, indent=2)
        except Exception:
            formatted = str(obj.details)
        return format_html(
            '<pre style="background:#f4f4f5;border:1px solid #e5e7eb;border-radius:6px;'
            'padding:12px 16px;font-size:12px;line-height:1.6;overflow-x:auto;'
            'max-height:400px;white-space:pre-wrap">{}</pre>',
            formatted,
        )
    details_pretty.short_description = "Detalhes"
