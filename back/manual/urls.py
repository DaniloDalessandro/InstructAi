from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ManualViewSet

router = DefaultRouter()
router.register(r'manuals', ManualViewSet, basename='manual')

urlpatterns = [
    path('', include(router.urls)),
]
