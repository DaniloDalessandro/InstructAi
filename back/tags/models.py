from django.db import models

# Create your models here.
class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)
    color = models.CharField(max_length=7, default='#3B82F6', help_text='Hex color code')
    is_active = models.BooleanField(default=True, help_text='Status da tag (Ativo/Inativo)')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(max_length=150, null=True, blank=True)
    updated_by = models.CharField(max_length=150, null=True, blank=True)

    def __str__(self):
        return self.name