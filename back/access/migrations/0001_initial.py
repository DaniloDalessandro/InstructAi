from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="AuditLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("action", models.CharField(
                    choices=[
                        ("create", "Criou conteúdo"), ("update", "Editou conteúdo"),
                        ("delete", "Excluiu conteúdo"), ("restore", "Restaurou conteúdo"),
                        ("grant_admin", "Concedeu admin delegado"),
                        ("revoke_admin", "Removeu admin delegado"),
                        ("transfer_owner", "Transferiu propriedade"),
                        ("unauthorized", "Tentativa de acesso não autorizado"),
                    ],
                    max_length=30, verbose_name="Ação",
                )),
                ("content_type", models.CharField(
                    choices=[
                        ("manual", "Manual"), ("tutorial", "Tutorial"),
                        ("course", "Curso"), ("other", "Outro"),
                    ],
                    default="other", max_length=20, verbose_name="Tipo",
                )),
                ("object_id", models.CharField(blank=True, max_length=100, verbose_name="ID do Objeto")),
                ("object_title", models.CharField(blank=True, max_length=500, verbose_name="Título do Objeto")),
                ("details", models.JSONField(blank=True, default=dict, verbose_name="Detalhes")),
                ("ip_address", models.GenericIPAddressField(blank=True, null=True, verbose_name="IP")),
                ("timestamp", models.DateTimeField(auto_now_add=True, verbose_name="Data/Hora")),
                ("user", models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name="audit_logs", to=settings.AUTH_USER_MODEL, verbose_name="Usuário",
                )),
            ],
            options={
                "verbose_name": "Log de Auditoria",
                "verbose_name_plural": "Logs de Auditoria",
                "ordering": ["-timestamp"],
            },
        ),
        migrations.AddIndex(
            model_name="auditlog",
            index=models.Index(fields=["content_type", "object_id"], name="audit_content_idx"),
        ),
        migrations.AddIndex(
            model_name="auditlog",
            index=models.Index(fields=["user", "timestamp"], name="audit_user_ts_idx"),
        ),
        migrations.AddIndex(
            model_name="auditlog",
            index=models.Index(fields=["action", "timestamp"], name="audit_action_ts_idx"),
        ),
    ]
