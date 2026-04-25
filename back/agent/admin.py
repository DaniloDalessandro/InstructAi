from django.contrib import admin
from .models import ConversationSession, Message


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    readonly_fields = ["role", "content", "created_at"]
    ordering = ["created_at"]
    max_num = 30


@admin.register(ConversationSession)
class ConversationSessionAdmin(admin.ModelAdmin):
    list_display = ["title", "user", "message_count", "is_active", "created_at", "updated_at"]
    list_filter = ["is_active", "created_at"]
    search_fields = ["title", "user__email"]
    readonly_fields = ["session_id", "created_at", "updated_at"]
    inlines = [MessageInline]


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ["session", "role", "content_preview", "created_at"]
    list_filter = ["role", "created_at"]
    search_fields = ["content", "session__title"]

    def content_preview(self, obj):
        return obj.content[:80]
    content_preview.short_description = "Conteúdo"
