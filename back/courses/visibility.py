from django.db.models import Q
from django.utils import timezone
from .models import Course


def visible_courses(user):
    courses = Course.objects.all()
    if not user.is_authenticated:
        return courses.none()
    if user.is_staff or user.is_superuser:
        return courses
    now = timezone.now()
    sector = Q(available_for_all_sectors=True)
    if user.sector_id:
        sector |= Q(allowed_sectors=user.sector_id)
    period = (Q(available_from__isnull=True) | Q(available_from__lte=now)) & (Q(available_until__isnull=True) | Q(available_until__gte=now))
    return courses.filter(is_active=True).filter(Q(owner=user) | Q(shared_admins=user) | (sector & period)).distinct()
