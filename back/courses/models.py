import uuid
from django.db import models
from sectors.models import Sector
from tags.models import Tag
from django.contrib.auth import get_user_model

User = get_user_model()


class Course(models.Model):
    """Modelo de Curso"""
    name = models.CharField(max_length=200, verbose_name='Nome do Curso')
    description = models.TextField(verbose_name='Descrição')
    sector = models.ForeignKey(Sector, on_delete=models.PROTECT, related_name='courses', verbose_name='Setor')
    tags = models.ManyToManyField(Tag, related_name='courses', blank=True, verbose_name='Tags')
    has_final_exam = models.BooleanField(default=False, verbose_name='Possui Prova Final')
    passing_score = models.IntegerField(default=70, verbose_name='Nota Mínima para Aprovação (%)', help_text='Percentual de acerto necessário para aprovação')
    workload_hours = models.IntegerField(default=0, verbose_name='Carga Horária (horas)')
    exam_duration_minutes = models.IntegerField(default=60, verbose_name='Duração da Prova (minutos)', help_text='Tempo em minutos que o aluno terá para realizar a prova')
    is_active = models.BooleanField(default=True, verbose_name='Ativo')

    # Auditoria
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Criado em')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Atualizado em')
    created_by = models.CharField(max_length=150, null=True, blank=True, verbose_name='Criado por')
    updated_by = models.CharField(max_length=150, null=True, blank=True, verbose_name='Atualizado por')

    class Meta:
        verbose_name = 'Curso'
        verbose_name_plural = 'Cursos'
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    def get_total_lessons(self):
        """Retorna o total de aulas do curso"""
        return self.lessons.filter(is_active=True).count()


class Lesson(models.Model):
    """Modelo de Aula"""
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='lessons', verbose_name='Curso')
    name = models.CharField(max_length=200, verbose_name='Nome da Aula')
    youtube_url = models.URLField(verbose_name='Link do YouTube', help_text='URL completa do vídeo no YouTube')
    order = models.IntegerField(default=0, verbose_name='Ordem')
    is_active = models.BooleanField(default=True, verbose_name='Ativo')

    # Auditoria
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Criado em')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Atualizado em')
    created_by = models.CharField(max_length=150, null=True, blank=True, verbose_name='Criado por')
    updated_by = models.CharField(max_length=150, null=True, blank=True, verbose_name='Atualizado por')

    class Meta:
        verbose_name = 'Aula'
        verbose_name_plural = 'Aulas'
        ordering = ['course', 'order']
        unique_together = ['course', 'order']

    def __str__(self):
        return f"{self.course.name} - {self.name}"

    def get_youtube_video_id(self):
        """Extrai o ID do vídeo do YouTube da URL"""
        if 'youtube.com/watch?v=' in self.youtube_url:
            return self.youtube_url.split('watch?v=')[1].split('&')[0]
        elif 'youtu.be/' in self.youtube_url:
            return self.youtube_url.split('youtu.be/')[1].split('?')[0]
        return None


class Question(models.Model):
    """Modelo de Questão da Prova"""
    OPTION_CHOICES = [
        ('A', 'Opção A'),
        ('B', 'Opção B'),
        ('C', 'Opção C'),
        ('D', 'Opção D'),
    ]

    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='questions', verbose_name='Curso')
    text = models.TextField(verbose_name='Enunciado da Questão')
    option_a = models.CharField(max_length=500, verbose_name='Alternativa A')
    option_b = models.CharField(max_length=500, verbose_name='Alternativa B')
    option_c = models.CharField(max_length=500, verbose_name='Alternativa C')
    option_d = models.CharField(max_length=500, verbose_name='Alternativa D')
    correct_option = models.CharField(max_length=1, choices=OPTION_CHOICES, verbose_name='Alternativa Correta')
    order = models.IntegerField(default=0, verbose_name='Ordem')

    # Auditoria
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Criado em')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Atualizado em')
    created_by = models.CharField(max_length=150, null=True, blank=True, verbose_name='Criado por')
    updated_by = models.CharField(max_length=150, null=True, blank=True, verbose_name='Atualizado por')

    class Meta:
        verbose_name = 'Questão'
        verbose_name_plural = 'Questões'
        ordering = ['course', 'order']
        unique_together = ['course', 'order']

    def __str__(self):
        return f"{self.course.name} - Questão {self.order}"


class CourseProgress(models.Model):
    """Modelo de Progresso do Usuário no Curso"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='course_progress', verbose_name='Usuário')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='user_progress', verbose_name='Curso')
    completion_percentage = models.IntegerField(default=0, verbose_name='Percentual de Conclusão')
    exam_score = models.IntegerField(null=True, blank=True, verbose_name='Nota da Prova')
    exam_passed = models.BooleanField(default=False, verbose_name='Aprovado na Prova')
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name='Concluído em')

    # Auditoria
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Criado em')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Atualizado em')

    class Meta:
        verbose_name = 'Progresso do Curso'
        verbose_name_plural = 'Progressos dos Cursos'
        unique_together = ['user', 'course']

    def __str__(self):
        return f"{self.user.email} - {self.course.name} ({self.completion_percentage}%)"

    def can_generate_certificate(self):
        """Verifica se o usuário pode gerar certificado"""
        if self.completion_percentage < 100:
            return False
        if self.course.has_final_exam and not self.exam_passed:
            return False
        return True


class LessonProgress(models.Model):
    """Modelo de Progresso da Aula"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='lesson_progress', verbose_name='Usuário')
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='user_progress', verbose_name='Aula')
    is_completed = models.BooleanField(default=False, verbose_name='Concluído')
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name='Concluído em')

    # Auditoria
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Criado em')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Atualizado em')

    class Meta:
        verbose_name = 'Progresso da Aula'
        verbose_name_plural = 'Progressos das Aulas'
        unique_together = ['user', 'lesson']

    def __str__(self):
        return f"{self.user.email} - {self.lesson.name} ({'Concluído' if self.is_completed else 'Pendente'})"


class Certificate(models.Model):
    """Modelo de Certificado"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='certificates', verbose_name='Usuário')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='certificates', verbose_name='Curso')
    validation_code = models.UUIDField(default=uuid.uuid4, editable=False, unique=True, verbose_name='Código de Validação')
    pdf_file = models.FileField(upload_to='certificates/', null=True, blank=True, verbose_name='Arquivo PDF')
    issued_at = models.DateTimeField(auto_now_add=True, verbose_name='Emitido em')

    # Auditoria
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Criado em')

    class Meta:
        verbose_name = 'Certificado'
        verbose_name_plural = 'Certificados'
        unique_together = ['user', 'course']
        ordering = ['-issued_at']

    def __str__(self):
        return f"Certificado - {self.user.email} - {self.course.name}"
