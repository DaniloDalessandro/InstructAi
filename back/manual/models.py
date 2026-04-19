from django.db import models
from sectors.models import Sector
from tags.models import Tag


class Manual(models.Model):
    """Modelo de Manual em PDF vinculado a setores e tags."""
    name = models.CharField(max_length=200, verbose_name='Nome do Manual')
    pdf_file = models.FileField(upload_to='manuais/', verbose_name='Arquivo PDF')
    sectors = models.ManyToManyField(Sector, related_name='manuals', verbose_name='Setores')
    tags = models.ManyToManyField(Tag, related_name='manuals', blank=True, verbose_name='Tags')
    is_active = models.BooleanField(default=True, verbose_name='Ativo')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Criado em')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Atualizado em')
    created_by = models.CharField(max_length=150, null=True, blank=True, verbose_name='Criado por')
    updated_by = models.CharField(max_length=150, null=True, blank=True, verbose_name='Atualizado por')

    class Meta:
        verbose_name = 'Manual'
        verbose_name_plural = 'Manuais'
        ordering = ['-created_at']

    def __str__(self):
        return self.name
