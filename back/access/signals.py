"""
Signals de auditoria automática para Manual, Tutorial e Course.
Registra criação, edição e exclusão sem esforço nas views.
"""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver


def _log(action, content_type, instance):
    from access.models import log_action
    try:
        log_action(
            user=None,  # usuário não disponível em signals genéricos
            action=action,
            content_type=content_type,
            obj=instance,
            details={"via": "signal"},
        )
    except Exception:
        pass  # nunca quebrar por causa de log


@receiver(post_save, sender="manual.Manual")
def audit_manual_save(sender, instance, created, **kwargs):
    _log("create" if created else "update", "manual", instance)


@receiver(post_delete, sender="manual.Manual")
def audit_manual_delete(sender, instance, **kwargs):
    _log("delete", "manual", instance)


@receiver(post_save, sender="tutorial.Tutorial")
def audit_tutorial_save(sender, instance, created, **kwargs):
    _log("create" if created else "update", "tutorial", instance)


@receiver(post_delete, sender="tutorial.Tutorial")
def audit_tutorial_delete(sender, instance, **kwargs):
    _log("delete", "tutorial", instance)


@receiver(post_save, sender="courses.Course")
def audit_course_save(sender, instance, created, **kwargs):
    _log("create" if created else "update", "course", instance)


@receiver(post_delete, sender="courses.Course")
def audit_course_delete(sender, instance, **kwargs):
    _log("delete", "course", instance)
