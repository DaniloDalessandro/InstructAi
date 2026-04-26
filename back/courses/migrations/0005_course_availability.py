from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0004_add_owner_shared_admins'),
        ('sectors', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='course',
            name='available_for_all_sectors',
            field=models.BooleanField(default=True, verbose_name='Disponível para todos os setores'),
        ),
        migrations.AddField(
            model_name='course',
            name='allowed_sectors',
            field=models.ManyToManyField(
                blank=True,
                related_name='allowed_courses',
                to='sectors.sector',
                verbose_name='Setores autorizados',
            ),
        ),
        migrations.AddField(
            model_name='course',
            name='available_from',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Disponível a partir de'),
        ),
        migrations.AddField(
            model_name='course',
            name='available_until',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Disponível até'),
        ),
        migrations.AddField(
            model_name='course',
            name='send_email_notification',
            field=models.BooleanField(default=False, verbose_name='Notificar por e-mail'),
        ),
        migrations.AddField(
            model_name='course',
            name='notification_sent_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Notificação enviada em'),
        ),
    ]
