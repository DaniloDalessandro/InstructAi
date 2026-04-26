from django.apps import AppConfig


class AccessConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "access"
    verbose_name = "Controle de Acesso"

    def ready(self):
        import access.signals  # noqa: F401
