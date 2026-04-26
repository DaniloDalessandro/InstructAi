from django.db import models
from django.conf import settings


class AuditLog(models.Model):
    """Registro de auditoria para todas as ações relevantes de permissão e conteúdo."""

    ACTION_CHOICES = [
        # Conteúdo
        ("create",          "Criou conteúdo"),
        ("update",          "Editou conteúdo"),
        ("delete",          "Excluiu conteúdo"),
        ("restore",         "Restaurou conteúdo"),
        # Permissões
        ("grant_admin",     "Concedeu admin delegado"),
        ("revoke_admin",    "Removeu admin delegado"),
        ("transfer_owner",  "Transferiu propriedade"),
        # Acesso
        ("unauthorized",    "Tentativa de acesso não autorizado"),
    ]

    CONTENT_TYPE_CHOICES = [
        ("manual",   "Manual"),
        ("tutorial", "Tutorial"),
        ("course",   "Curso"),
        ("other",    "Outro"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_logs",
        verbose_name="Usuário",
    )
    action = models.CharField(
        max_length=30, choices=ACTION_CHOICES, verbose_name="Ação"
    )
    content_type = models.CharField(
        max_length=20, choices=CONTENT_TYPE_CHOICES, default="other", verbose_name="Tipo"
    )
    object_id = models.CharField(max_length=100, blank=True, verbose_name="ID do Objeto")
    object_title = models.CharField(max_length=500, blank=True, verbose_name="Título do Objeto")
    details = models.JSONField(default=dict, blank=True, verbose_name="Detalhes")
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name="IP")
    timestamp = models.DateTimeField(auto_now_add=True, verbose_name="Data/Hora")

    class Meta:
        verbose_name = "Log de Auditoria"
        verbose_name_plural = "Logs de Auditoria"
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["content_type", "object_id"]),
            models.Index(fields=["user", "timestamp"]),
            models.Index(fields=["action", "timestamp"]),
        ]

    def __str__(self):
        user_str = self.user.email if self.user else "Anônimo"
        return f"[{self.get_action_display()}] {user_str} → {self.object_title or self.object_id}"


def log_action(user, action, content_type, obj=None, details=None, request=None):
    """Helper para registrar ação de auditoria de forma concisa."""
    ip = None
    if request:
        x_forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
        ip = x_forwarded.split(",")[0].strip() if x_forwarded else request.META.get("REMOTE_ADDR")

    title = ""
    obj_id = ""
    if obj:
        obj_id = str(getattr(obj, "pk", "") or getattr(obj, "id", ""))
        title = (
            getattr(obj, "name", None)
            or getattr(obj, "title", None)
            or str(obj)
        )[:500]

    AuditLog.objects.create(
        user=user if (user and user.is_authenticated) else None,
        action=action,
        content_type=content_type,
        object_id=obj_id,
        object_title=title,
        details=details or {},
        ip_address=ip,
    )
