import uuid
from django.db import models
from django.utils import timezone
from django.conf import settings


class Tutorial(models.Model):
    """Main tutorial model"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255, verbose_name="Título")
    description = models.TextField(verbose_name="Descrição")
    sector = models.ForeignKey(
        'sectors.Sector',
        on_delete=models.PROTECT,
        related_name='tutorials',
        verbose_name="Setor"
    )
    tags = models.ManyToManyField(
        'tags.Tag',
        related_name='tutorials',
        blank=True,
        verbose_name="Tags"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_tutorials',
        verbose_name="Criado por"
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='updated_tutorials',
        null=True,
        blank=True,
        verbose_name="Atualizado por"
    )
    is_active = models.BooleanField(default=True, verbose_name="Ativo")
    created_at = models.DateTimeField(default=timezone.now, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")

    class Meta:
        verbose_name = "Tutorial"
        verbose_name_plural = "Tutoriais"
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    @property
    def step_count(self):
        """Returns the number of steps in this tutorial"""
        return self.steps.count()


class TutorialStep(models.Model):
    """Individual step within a tutorial"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tutorial = models.ForeignKey(
        Tutorial,
        on_delete=models.CASCADE,
        related_name='steps',
        verbose_name="Tutorial"
    )
    order = models.IntegerField(verbose_name="Ordem")
    title = models.CharField(max_length=255, verbose_name="Título")
    content = models.TextField(
        help_text="Conteúdo do passo (HTML/Markdown)",
        verbose_name="Conteúdo"
    )
    created_at = models.DateTimeField(default=timezone.now, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")

    class Meta:
        verbose_name = "Passo do Tutorial"
        verbose_name_plural = "Passos do Tutorial"
        ordering = ['order']
        unique_together = [['tutorial', 'order']]

    def __str__(self):
        return f"{self.tutorial.title} - Passo {self.order}: {self.title}"


class TutorialMedia(models.Model):
    """Media files (images/videos) attached to tutorial steps"""
    MEDIA_TYPE_CHOICES = [
        ('image', 'Imagem'),
        ('video_upload', 'Vídeo (Upload)'),
        ('video_embed', 'Vídeo (Embed)'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    step = models.ForeignKey(
        TutorialStep,
        on_delete=models.CASCADE,
        related_name='media',
        verbose_name="Passo"
    )
    media_type = models.CharField(
        max_length=20,
        choices=MEDIA_TYPE_CHOICES,
        verbose_name="Tipo de Mídia"
    )
    file = models.FileField(
        upload_to='tutorials/%Y/%m/%d/',
        blank=True,
        null=True,
        verbose_name="Arquivo"
    )
    embed_url = models.URLField(
        blank=True,
        null=True,
        verbose_name="URL de Embed"
    )
    caption = models.TextField(
        blank=True,
        null=True,
        verbose_name="Legenda"
    )
    annotations = models.JSONField(
        blank=True,
        null=True,
        help_text="Dados de anotações do Fabric.js/Konva.js em formato JSON",
        verbose_name="Anotações"
    )
    order = models.IntegerField(verbose_name="Ordem")
    created_at = models.DateTimeField(default=timezone.now, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")

    class Meta:
        verbose_name = "Mídia do Tutorial"
        verbose_name_plural = "Mídias do Tutorial"
        ordering = ['order']

    def __str__(self):
        return f"{self.step.title} - {self.get_media_type_display()} #{self.order}"

    def clean(self):
        """Validate that either file or embed_url is provided based on media_type"""
        from django.core.exceptions import ValidationError

        if self.media_type in ['image', 'video_upload'] and not self.file:
            raise ValidationError({
                'file': 'Arquivo é obrigatório para este tipo de mídia.'
            })

        if self.media_type == 'video_embed' and not self.embed_url:
            raise ValidationError({
                'embed_url': 'URL de embed é obrigatória para vídeos incorporados.'
            })
