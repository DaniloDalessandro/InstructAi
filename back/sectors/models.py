from django.db import models


class Sector(models.Model):
    """Modelo de Setor para organização de conteúdo."""
    name = models.CharField(max_length=100, unique=True, verbose_name='Nome')
    is_active = models.BooleanField(default=True, verbose_name='Ativo')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Criado em')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Atualizado em')
    created_by = models.CharField(max_length=150, null=True, blank=True, verbose_name='Criado por')
    updated_by = models.CharField(max_length=150, null=True, blank=True, verbose_name='Atualizado por')

    class Meta:
        verbose_name = 'Setor'
        verbose_name_plural = 'Setores'
        ordering = ['name']

    def __str__(self):
        return self.name
