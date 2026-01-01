import uuid
from django.db import models
from django.utils import timezone
from django.conf import settings


class KnowledgeArea(models.Model):
    """Knowledge area for categorizing tutorials (e.g., Programming, Design, Business)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, verbose_name="Nome")
    description = models.TextField(blank=True, null=True, verbose_name="Descrição")
    created_at = models.DateTimeField(default=timezone.now, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")

    class Meta:
        verbose_name = "Área de Conhecimento"
        verbose_name_plural = "Áreas de Conhecimento"
        ordering = ['name']

    def __str__(self):
        return self.name


class TutorialTag(models.Model):
    """Tags for tutorials (e.g., Python, React, Beginner-Friendly)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True, verbose_name="Nome")
    created_at = models.DateTimeField(default=timezone.now, verbose_name="Criado em")

    class Meta:
        verbose_name = "Tag"
        verbose_name_plural = "Tags"
        ordering = ['name']

    def __str__(self):
        return self.name


class Tutorial(models.Model):
    """Main tutorial model"""
    DIFFICULTY_CHOICES = [
        ('iniciante', 'Iniciante'),
        ('intermediario', 'Intermediário'),
        ('avancado', 'Avançado'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255, verbose_name="Título")
    description = models.TextField(verbose_name="Descrição")
    knowledge_area = models.ForeignKey(
        KnowledgeArea,
        on_delete=models.PROTECT,
        related_name='tutorials',
        verbose_name="Área de Conhecimento"
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tutorials',
        verbose_name="Autor"
    )
    is_published = models.BooleanField(default=False, verbose_name="Publicado")
    difficulty_level = models.CharField(
        max_length=20,
        choices=DIFFICULTY_CHOICES,
        default='iniciante',
        verbose_name="Nível de Dificuldade"
    )
    estimated_time = models.IntegerField(
        help_text="Tempo estimado em minutos",
        verbose_name="Tempo Estimado (min)"
    )
    created_at = models.DateTimeField(default=timezone.now, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")
    published_at = models.DateTimeField(blank=True, null=True, verbose_name="Publicado em")
    tags = models.ManyToManyField(
        TutorialTag,
        related_name='tutorials',
        blank=True,
        verbose_name="Tags"
    )

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

    def publish(self):
        """Publish the tutorial"""
        if not self.is_published:
            self.is_published = True
            self.published_at = timezone.now()
            self.save()

    def unpublish(self):
        """Unpublish the tutorial"""
        if self.is_published:
            self.is_published = False
            self.save()


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
