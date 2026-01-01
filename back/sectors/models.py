from django.db import models

# Create your models here.
class Sector(models.Model):
    name = models.CharField(max_length=100, unique=True)
    is_active = models.BooleanField(default=True, help_text='Status do setor (Ativo/Inativo)')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(max_length=150, null=True, blank=True)
    updated_by = models.CharField(max_length=150, null=True, blank=True)

    def __str__(self):
        return self.name
    

    