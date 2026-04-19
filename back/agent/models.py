import uuid
from django.db import models
from django.conf import settings


class ConversationSession(models.Model):
    session_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="alice_sessions",
    )
    title = models.CharField(max_length=255, blank=True, default="Nova conversa")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        verbose_name = "Sessão de Conversa"
        verbose_name_plural = "Sessões de Conversa"

    @property
    def message_count(self):
        return self.messages.count()

    def __str__(self):
        return f"{self.user.email} — {self.title}"


class Message(models.Model):
    ROLE_CHOICES = [
        ("user", "Usuário"),
        ("assistant", "Assistente"),
    ]

    session = models.ForeignKey(
        ConversationSession,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        verbose_name = "Mensagem"
        verbose_name_plural = "Mensagens"

    def __str__(self):
        return f"[{self.role}] {self.content[:60]}"
