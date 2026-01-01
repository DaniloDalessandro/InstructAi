from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers
from .views import (
    KnowledgeAreaViewSet,
    TutorialTagViewSet,
    TutorialViewSet,
    TutorialStepViewSet,
    TutorialMediaViewSet,
)

# Main router
router = DefaultRouter()
router.register(r'knowledge-areas', KnowledgeAreaViewSet, basename='knowledge-area')
router.register(r'tags', TutorialTagViewSet, basename='tutorial-tag')
router.register(r'tutorials', TutorialViewSet, basename='tutorial')

# Nested router for tutorial steps
tutorials_router = routers.NestedDefaultRouter(router, r'tutorials', lookup='tutorial')
tutorials_router.register(r'steps', TutorialStepViewSet, basename='tutorial-steps')

# Nested router for step media
steps_router = routers.NestedDefaultRouter(tutorials_router, r'steps', lookup='step')
steps_router.register(r'media', TutorialMediaViewSet, basename='step-media')

urlpatterns = [
    path('', include(router.urls)),
    path('', include(tutorials_router.urls)),
    path('', include(steps_router.urls)),
]
