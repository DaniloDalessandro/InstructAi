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
