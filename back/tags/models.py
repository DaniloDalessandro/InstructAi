from django.db import models


class Tag(models.Model):
    """Modelo de Tag para categorização de conteúdo."""
    name = models.CharField(max_length=50, unique=True, verbose_name='Nome')
    color = models.CharField(max_length=7, default='#3B82F6', help_text='Código hexadecimal de cor', verbose_name='Cor')
    is_active = models.BooleanField(default=True, verbose_name='Ativo')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Criado em')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Atualizado em')
    created_by = models.CharField(max_length=150, null=True, blank=True, verbose_name='Criado por')
    updated_by = models.CharField(max_length=150, null=True, blank=True, verbose_name='Atualizado por')

    class Meta:
        verbose_name = 'Tag'
        verbose_name_plural = 'Tags'
        ordering = ['name']

    def __str__(self):
        return self.name
