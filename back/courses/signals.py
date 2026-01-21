from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from .models import CourseProgress, Certificate, Course
from .certificate_generator import generate_certificate_pdf


@receiver(post_save, sender=CourseProgress)
def check_course_completion(sender, instance, created, **kwargs):
    """
    Signal para detectar conclusão do curso e gerar certificado automaticamente.

    Um curso é considerado concluído quando:
    - Completion_percentage = 100%
    - Se houver prova final, exam_passed = True
    """
    # Só processar se o progresso for 100%
    if instance.completion_percentage != 100:
        return

    course = instance.course

    # Se o curso tem prova final, verificar se passou
    if course.has_final_exam and not instance.exam_passed:
        return

    # Atualizar completed_at se ainda não estiver definido
    if not instance.completed_at:
        instance.completed_at = timezone.now()
        instance.save(update_fields=['completed_at'])

    # Verificar se já existe certificado
    certificate_exists = Certificate.objects.filter(
        user=instance.user,
        course=course
    ).exists()

    if not certificate_exists:
        # Gerar certificado
        certificate = Certificate.objects.create(
            user=instance.user,
            course=course
        )
        print(f'[OK] Certificado gerado para {instance.user.email} - Curso: {course.name}')


@receiver(post_save, sender=Certificate)
def generate_certificate_pdf_on_create(sender, instance, created, **kwargs):
    """
    Gera o PDF do certificado quando um certificado é criado.
    """
    if created and not instance.pdf_file:
        try:
            # Gerar PDF
            pdf_content = generate_certificate_pdf(instance)

            # Salvar PDF no modelo
            instance.pdf_file.save(pdf_content.name, pdf_content, save=True)

            print(f'[OK] PDF do certificado gerado: {instance.pdf_file.name}')
        except Exception as e:
            print(f'[ERRO] Erro ao gerar PDF do certificado: {str(e)}')
            import traceback
            traceback.print_exc()
