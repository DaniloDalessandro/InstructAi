import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from .models import CourseProgress, Certificate, Course, IssuingCompany
from .certificate_generator import generate_certificate_pdf as build_pdf_sync

logger = logging.getLogger(__name__)


@receiver(post_save, sender=CourseProgress)
def check_course_completion(sender, instance, created, **kwargs):
    """
    Detecta conclusão do curso e gera certificado automaticamente.
    Condições: completion_percentage = 100% e, se houver prova, exam_passed = True.
    """
    if instance.completion_percentage != 100:
        return

    course = instance.course

    if course.has_final_exam and not instance.exam_passed:
        return

    if not instance.completed_at:
        instance.completed_at = timezone.now()
        instance.save(update_fields=['completed_at'])

    already_exists = Certificate.objects.filter(
        user=instance.user,
        course=course,
    ).exists()

    if not already_exists and IssuingCompany.objects.filter(pk=1).exists():
        Certificate.objects.create(user=instance.user, course=course)
        logger.info('Certificado criado para %s — curso: %s', instance.user.email, course.name)


@receiver(post_save, sender=Certificate)
def generate_certificate_pdf_on_create(sender, instance, created, **kwargs):
    """
    Gera o PDF quando um certificado é criado.
    Tenta geração síncrona; em caso de falha, agenda task Celery como fallback.
    """
    if not created or instance.pdf_file:
        return

    try:
        pdf_content = build_pdf_sync(instance)
        instance.pdf_file.save(pdf_content.name, pdf_content, save=True)
        logger.info('PDF do certificado %d gerado: %s', instance.id, instance.pdf_file.name)
    except Exception as exc:
        logger.error('Falha na geração síncrona do PDF %d: %s — agendando via Celery', instance.id, exc)
        try:
            from courses.tasks import generate_certificate_pdf as generate_pdf_task
            generate_pdf_task.delay(instance.id)
        except Exception as task_exc:
            logger.error('Falha ao agendar task de PDF %d: %s', instance.id, task_exc)
