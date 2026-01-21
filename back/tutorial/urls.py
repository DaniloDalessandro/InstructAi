from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TutorialViewSet, TutorialStepViewSet, TutorialMediaViewSet

# Main router
router = DefaultRouter()
router.register(r'tutorials', TutorialViewSet, basename='tutorial')
router.register(r'steps', TutorialStepViewSet, basename='tutorial-step')
router.register(r'media', TutorialMediaViewSet, basename='tutorial-media')

urlpatterns = [
    path('', include(router.urls)),
]
