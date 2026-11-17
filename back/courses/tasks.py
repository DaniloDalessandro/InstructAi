"""
Tarefas Celery para o módulo de cursos.
"""
from __future__ import annotations
import logging
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    queue='default',
    name='courses.tasks.generate_certificate_pdf',
)
def generate_certificate_pdf(self, certificate_id: int):
    """
    Gera o PDF do certificado usando ReportLab e salva no campo pdf_file.
    """
    from courses.models import Certificate
    from courses.certificate_generator import generate_certificate_pdf as build_pdf
    try:
        cert = Certificate.objects.select_related('user', 'course').get(pk=certificate_id)
        if not cert.issuer_snapshot:
            cert.save()
        content = build_pdf(cert)
        cert.pdf_file.save(content.name, content, save=True)
        return {'certificate_id': cert.id, 'filename': content.name}
    except Certificate.DoesNotExist:
        logger.warning('Certificado %s não encontrado.', certificate_id)
    except Exception as exc:
        raise self.retry(exc=exc)


# ────────────────────────────────────────────────��────────────────────────────
# Helpers de e-mail para lembretes
# ─────────────────────────────────────────────────────────────────────────────

def _reminder_email_content(user_name, course_name, deadline_fmt, hours_remaining, course_url, system_name):
    """Retorna (text_body, html_body) para o e-mail de lembrete."""
    label_map = {72: 'Faltam 72 horas', 48: 'Faltam 48 horas', 24: 'Últimas 24 horas'}
    urgency_map = {72: '#5e6ad2', 48: '#f59e0b', 24: '#e5484d'}
    urgency_label = label_map.get(hours_remaining, f'Faltam {hours_remaining}h')
    urgency_color = urgency_map.get(hours_remaining, '#5e6ad2')

    text_body = (
        f'Olá, {user_name}!\n\n'
        f'{urgency_label} para o encerramento do curso:\n'
        f'{course_name}\n\n'
        f'Prazo final: {deadline_fmt}\n\n'
        f'Acesse agora: {course_url}\n\n'
        f'Equipe {system_name}'
    )

    html_body = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#6d28d9,#4f46e5);padding:28px 40px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">{system_name}</h1>
            <p style="margin:6px 0 0;color:#e0d7ff;font-size:13px;">Lembrete de Prazo</p>
          </td>
        </tr>

        <!-- Urgency badge -->
        <tr>
          <td style="background:{urgency_color};padding:12px 40px;text-align:center;">
            <span style="color:#fff;font-size:15px;font-weight:700;letter-spacing:.5px;">
              {urgency_label} para o encerramento
            </span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 6px;color:#111;font-size:17px;font-weight:600;">
              Olá, {user_name}!
            </p>
            <p style="margin:0 0 24px;color:#555;font-size:14px;">
              Você ainda não concluiu o curso abaixo. O prazo está se encerrando.
            </p>

            <!-- Course card -->
            <div style="background:#f8f7ff;border-left:4px solid {urgency_color};border-radius:8px;padding:20px 24px;margin-bottom:28px;">
              <h2 style="margin:0 0 10px;color:#4f46e5;font-size:18px;">{course_name}</h2>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:4px 12px 4px 0;color:#888;font-size:13px;">Prazo final</td>
                  <td style="padding:4px 0;color:#111;font-size:13px;font-weight:600;">{deadline_fmt}</td>
                </tr>
                <tr>
                  <td style="padding:4px 12px 4px 0;color:#888;font-size:13px;">Tempo restante</td>
                  <td style="padding:4px 0;color:{urgency_color};font-size:13px;font-weight:700;">{hours_remaining} horas</td>
                </tr>
              </table>
            </div>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center" style="padding:0 0 32px;">
                <a href="{course_url}"
                   style="display:inline-block;background:{urgency_color};color:#fff;text-decoration:none;
                          padding:14px 36px;border-radius:8px;font-size:15px;font-weight:700;">
                  Ir para o Curso
                </a>
              </td></tr>
            </table>

            <p style="margin:0;color:#bbb;font-size:11px;text-align:center;line-height:1.6;">
              Você está recebendo este e-mail pois ainda não concluiu o curso.<br>
              &copy; {system_name}
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

    return text_body, html_body


def _dispatch_reminders_for_course(course, reminder_type):
    """
    Identifica usuários pendentes, envia e-mails e registra logs.
    Retorna (sent, failed).
    """
    from datetime import timedelta
    from django.db.models import Q
    from django.conf import settings
    from django.contrib.auth import get_user_model
    from django.core.mail import EmailMultiAlternatives
    from courses.models import CourseProgress, CourseReminderLog

    User = get_user_model()

    # ── Usuários elegíveis ───────────────────���────────────────────────────────
    users_qs = User.objects.filter(is_active=True).exclude(email='')

    if not course.available_for_all_sectors:
        allowed = course.allowed_sectors.all()
        if allowed.exists():
            users_qs = users_qs.filter(sector__in=allowed)

    # Exclui quem concluiu (100 % + prova aprovada se houver)
    concluded_ids = (
        CourseProgress.objects
        .filter(course=course, completion_percentage=100)
        .filter(Q(course__has_final_exam=False) | Q(exam_passed=True))
        .values_list('user_id', flat=True)
    )
    users_qs = users_qs.exclude(id__in=concluded_ids)

    # Exclui quem já recebeu este tipo de lembrete
    already_sent_ids = (
        CourseReminderLog.objects
        .filter(course=course, reminder_type=reminder_type, status='sent')
        .values_list('user_id', flat=True)
    )
    users_qs = users_qs.exclude(id__in=already_sent_ids)

    users = list(users_qs.values('id', 'name', 'email'))
    if not users:
        return 0, 0

    # ── Metadados do e-mail ───────────────────────────────────────────────────
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
    system_name  = getattr(settings, 'SYSTEM_NAME', 'InstructAI')
    course_url   = f'{frontend_url}/cursos/{course.id}'

    local_deadline = timezone.localtime(course.available_until)
    deadline_fmt   = local_deadline.strftime('%d/%m/%Y às %H:%M')

    hours_map = {'72h': 72, '48h': 48, '24h': 24}
    hours     = hours_map[reminder_type]

    subject_map = {
        '72h': f'[Faltam 72h] Curso pendente para conclusão: {course.name}',
        '48h': f'[Faltam 48h] Prazo do curso se encerrando: {course.name}',
        '24h': f'[Últimas 24h] Conclua seu curso hoje: {course.name}',
    }
    subject = subject_map[reminder_type]

    sent = failed = 0

    for user in users:
        user_name = user['name'] or user['email'].split('@')[0]
        text_body, html_body = _reminder_email_content(
            user_name, course.name, deadline_fmt, hours, course_url, system_name,
        )

        log_kwargs = dict(course=course, user_id=user['id'], reminder_type=reminder_type)

        try:
            msg = EmailMultiAlternatives(
                subject=subject,
                body=text_body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[user['email']],
            )
            msg.attach_alternative(html_body, 'text/html')
            msg.send()

            CourseReminderLog.objects.update_or_create(
                **log_kwargs,
                defaults={'status': 'sent', 'error_message': None},
            )
            sent += 1
            logger.info('Lembrete %s enviado para %s (curso %d).', reminder_type, user['email'], course.id)

        except Exception as exc:
            CourseReminderLog.objects.update_or_create(
                **log_kwargs,
                defaults={'status': 'failed', 'error_message': str(exc)},
            )
            failed += 1
            logger.error(
                'Falha ao enviar lembrete %s para %s (curso %d): %s',
                reminder_type, user['email'], course.id, exc,
            )

    return sent, failed


@shared_task(
    name='courses.tasks.send_course_reminders',
    queue='default',
)
def send_course_reminders():
    """
    Verifica cursos com prazo definido e envia e-mails de lembrete
    faltando 72h, 48h e 24h para o encerramento.
    Executada a cada 30 minutos pelo Celery Beat.
    Idempotente: CourseReminderLog.unique_together impede duplicatas.
    """
    from datetime import timedelta
    from courses.models import Course

    now = timezone.now()
    WINDOW = timedelta(minutes=35)  # janela >= intervalo do beat (30min) para não perder disparos

    REMINDERS = [
        ('72h', timedelta(hours=72)),
        ('48h', timedelta(hours=48)),
        ('24h', timedelta(hours=24)),
    ]

    total_sent = total_failed = 0

    for reminder_type, delta in REMINDERS:
        target = now + delta
        courses = (
            Course.objects
            .filter(
                is_active=True,
                reminders_enabled=True,
                available_until__isnull=False,
                available_until__gte=target - WINDOW,
                available_until__lte=target + WINDOW,
            )
            .prefetch_related('allowed_sectors')
        )

        for course in courses:
            sent, failed = _dispatch_reminders_for_course(course, reminder_type)
            total_sent   += sent
            total_failed += failed
            if sent or failed:
                logger.info(
                    'Curso "%s" | lembrete %s | enviados: %d | falhas: %d',
                    course.name, reminder_type, sent, failed,
                )

    # Registra timestamp da última execução no Redis
    try:
        from django_redis import get_redis_connection
        rc = get_redis_connection('default')
        rc.set('course_reminders:last_run', timezone.localtime(now).strftime('%d/%m/%Y %H:%M'), ex=86400 * 7)
    except Exception:
        pass

    return {'sent': total_sent, 'failed': total_failed}


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=120,
    queue='default',
    name='courses.tasks.resend_reminder',
)
def resend_reminder(self, course_id: int, reminder_type: str, user_ids: list):
    """
    Reenvia um lembrete específico para uma lista de usuários (ação manual do admin).
    Remove o log anterior para permitir reenvio.
    """
    from courses.models import Course, CourseReminderLog

    try:
        course = (
            Course.objects
            .prefetch_related('allowed_sectors')
            .get(id=course_id)
        )
    except Course.DoesNotExist:
        logger.error('Curso %d não encontrado para reenvio de lembrete.', course_id)
        return

    # Remove logs anteriores para os usuários selecionados para permitir reenvio
    CourseReminderLog.objects.filter(
        course=course,
        user_id__in=user_ids,
        reminder_type=reminder_type,
    ).delete()

    try:
        sent, failed = _dispatch_reminders_for_course(course, reminder_type)
        logger.info('Reenvio lembrete %s curso %d: enviados=%d falhas=%d', reminder_type, course_id, sent, failed)
        return {'sent': sent, 'failed': failed}
    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task(
    name='courses.tasks.deactivate_expired_courses',
    queue='default',
)
def deactivate_expired_courses():
    """
    Desativa cursos cujo período disponível expirou (available_until < agora).
    Executada periodicamente pelo Celery Beat.
    """
    from courses.models import Course

    now = timezone.now()
    expired = Course.objects.filter(
        is_active=True,
        available_until__isnull=False,
        available_until__lt=now,
    )
    count = expired.update(is_active=False)
    if count:
        logger.info('Desativados %d curso(s) com prazo expirado.', count)
    return {'deactivated': count}


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    queue='default',
    name='courses.tasks.send_course_notification',
)
def send_course_notification(self, course_id: int):
    """
    Envia e-mail de notificação de novo curso para os usuários elegíveis.
    Responde à configuração de setores autorizados do curso.
    """
    from django.conf import settings
    from django.contrib.auth import get_user_model
    from django.core.mail import get_connection, EmailMultiAlternatives
    from courses.models import Course

    User = get_user_model()

    try:
        course = (
            Course.objects
            .select_related('sector')
            .prefetch_related('allowed_sectors')
            .get(id=course_id)
        )
    except Course.DoesNotExist:
        logger.error('Curso %d não encontrado para envio de notificação.', course_id)
        return

    # Determinar usuários elegíveis
    users = User.objects.filter(is_active=True).exclude(email='')
    if not course.available_for_all_sectors:
        allowed = course.allowed_sectors.all()
        if allowed.exists():
            users = users.filter(sector__in=allowed)

    users = list(users.values('name', 'email'))

    if not users:
        logger.info('Nenhum usuário elegível para o curso %d.', course_id)
        course.notification_sent_at = timezone.now()
        course.save(update_fields=['notification_sent_at', 'updated_at'])
        return

    # Formatar datas
    def fmt_dt(dt):
        if not dt:
            return None
        local = timezone.localtime(dt)
        return local.strftime('%d/%m/%Y %H:%M')

    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
    system_name = getattr(settings, 'SYSTEM_NAME', 'InstructAI')
    course_url = f'{frontend_url}/cursos/{course.id}'
    available_from_fmt = fmt_dt(course.available_from)
    available_until_fmt = fmt_dt(course.available_until)

    workload = f'{course.workload_hours}h' if course.workload_hours else None

    try:
        connection = get_connection()
        emails = []

        for user in users:
            subject = f'[{system_name}] Novo curso disponível: {course.name}'

            # ── Texto simples ────────────────────────────────────────────────
            text_lines = [
                f'Olá, {user["name"]}!',
                '',
                f'O curso "{course.name}" está disponível para você na plataforma {system_name}.',
                '',
                f'Descrição: {course.description[:300]}{"..." if len(course.description) > 300 else ""}',
            ]
            if workload:
                text_lines.append(f'Carga horária: {workload}')
            if available_from_fmt:
                text_lines.append(f'Início: {available_from_fmt}')
            if available_until_fmt:
                text_lines.append(f'Prazo: {available_until_fmt}')
            else:
                text_lines.append('Prazo: Sem prazo definido')
            text_lines += ['', f'Acesse agora: {course_url}', '', f'Equipe {system_name}']
            text_body = '\n'.join(text_lines)

            # ── HTML ─────────────────────────────────────────────────────────
            deadline_html = (
                f'<p><strong>Prazo para conclusão:</strong> {available_until_fmt}</p>'
                if available_until_fmt
                else '<p><em>Sem prazo definido — conclua no seu ritmo.</em></p>'
            )
            start_html = (
                f'<p><strong>Início:</strong> {available_from_fmt}</p>'
                if available_from_fmt
                else ''
            )
            workload_html = (
                f'<p><strong>Carga horária:</strong> {workload}</p>'
                if workload
                else ''
            )

            html_body = f"""
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#6d28d9,#4f46e5);padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">{system_name}</h1>
            <p style="margin:8px 0 0;color:#e0d7ff;font-size:14px;">Plataforma de Treinamento</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 8px;color:#111;font-size:18px;font-weight:600;">
              Olá, {user["name"]}! 👋
            </p>
            <p style="margin:0 0 24px;color:#555;font-size:14px;">
              Um novo curso está disponível para você:
            </p>

            <!-- Course card -->
            <div style="background:#f8f7ff;border-left:4px solid #6d28d9;border-radius:8px;padding:24px;margin-bottom:24px;">
              <h2 style="margin:0 0 12px;color:#4f46e5;font-size:20px;">{course.name}</h2>
              <p style="margin:0 0 16px;color:#444;font-size:14px;line-height:1.6;">
                {course.description[:300]}{'...' if len(course.description) > 300 else ''}
              </p>
              {workload_html}
              {start_html}
              {deadline_html}
            </div>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center" style="padding:8px 0 32px;">
                <a href="{course_url}"
                   style="display:inline-block;background:#6d28d9;color:#fff;text-decoration:none;
                          padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">
                  Acessar Curso
                </a>
              </td></tr>
            </table>

            <p style="margin:0;color:#999;font-size:12px;text-align:center;">
              Você recebeu este e-mail pois é elegível para este curso.<br>
              &copy; {system_name}
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
"""

            msg = EmailMultiAlternatives(
                subject=subject,
                body=text_body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[user['email']],
                connection=connection,
            )
            msg.attach_alternative(html_body, 'text/html')
            emails.append(msg)

        connection.open()
        sent = 0
        for msg in emails:
            try:
                msg.send()
                sent += 1
            except Exception as exc:
                logger.warning('Falha ao enviar e-mail para %s: %s', msg.to, exc)
        connection.close()

        logger.info('Notificação do curso %d enviada para %d/%d usuários.', course_id, sent, len(users))

    except Exception as exc:
        logger.error('Erro ao enviar notificações do curso %d: %s', course_id, exc)
        raise self.retry(exc=exc, countdown=60)

    course.notification_sent_at = timezone.now()
    course.save(update_fields=['notification_sent_at', 'updated_at'])
    return {'sent': len(users), 'course_id': course_id}
