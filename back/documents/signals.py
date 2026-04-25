"""
Signals Django para indexação automática quando conteúdo é criado/atualizado.
O aprendizado da Alice acontece aqui: qualquer novo conteúdo dispara indexação.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender="manual.Manual")
def on_manual_saved(sender, instance, created, **kwargs):
    """Indexa manual sempre que for criado ou atualizado."""
    from django.conf import settings
    if not settings.OPENAI_API_KEY:
        return
    from documents.tasks import index_manual
    # Delay de 2s para garantir que o arquivo foi salvo em disco
    index_manual.apply_async(args=[instance.id], countdown=2)


@receiver(post_save, sender="tutorial.Tutorial")
def on_tutorial_saved(sender, instance, created, **kwargs):
    """Indexa tutorial quando criado/atualizado."""
    from django.conf import settings
    if not settings.OPENAI_API_KEY:
        return
    from documents.tasks import index_tutorial
    index_tutorial.apply_async(args=[str(instance.id)], countdown=2)


@receiver(post_save, sender="tutorial.TutorialStep")
def on_tutorial_step_saved(sender, instance, **kwargs):
    """Reindexação quando um passo do tutorial é alterado."""
    from django.conf import settings
    if not settings.OPENAI_API_KEY:
        return
    from documents.tasks import index_tutorial
    # Reindexar o tutorial pai com debounce (countdown=5s)
    index_tutorial.apply_async(args=[str(instance.tutorial_id)], countdown=5)


@receiver(post_save, sender="courses.Course")
def on_course_saved(sender, instance, created, **kwargs):
    """Indexa curso quando criado/atualizado."""
    from django.conf import settings
    if not settings.OPENAI_API_KEY:
        return
    from documents.tasks import index_course
    index_course.apply_async(args=[instance.id], countdown=2)
