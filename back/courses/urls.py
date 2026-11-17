from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CourseViewSet, LessonViewSet, QuestionViewSet,
    CourseProgressViewSet, CertificateViewSet, DashboardStatsView,
)

router = DefaultRouter()
router.register(r'courses', CourseViewSet, basename='course')
router.register(r'lessons', LessonViewSet, basename='lesson')
router.register(r'questions', QuestionViewSet, basename='question')
router.register(r'progress', CourseProgressViewSet, basename='courseprogress')
router.register(r'certificates', CertificateViewSet, basename='certificate')

from .company_views import IssuingCompanyView, CertificateValidationView

urlpatterns = [
    path('issuing-company/', IssuingCompanyView.as_view(), name='issuing-company'),
    path('certificates/validate/<str:code>/', CertificateValidationView.as_view(), name='certificate-validation'),
    path('', include(router.urls)),
    path('dashboard-stats/', DashboardStatsView.as_view(), name='dashboard_stats'),
]
