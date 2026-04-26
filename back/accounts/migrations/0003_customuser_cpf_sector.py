from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_customuser_avatar_customuser_phone_and_more'),
        ('sectors', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='cpf',
            field=models.CharField(blank=True, default='', max_length=14, verbose_name='CPF'),
        ),
        migrations.AddField(
            model_name='customuser',
            name='sector',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='users',
                to='sectors.sector',
                verbose_name='Setor',
            ),
        ),
    ]
