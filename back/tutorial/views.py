from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count

from .models import Tutorial, TutorialStep, TutorialMedia
from .serializers import (
    TutorialListSerializer,
    TutorialDetailSerializer,
    TutorialCreateUpdateSerializer,
    TutorialStepSerializer,
    TutorialStepCreateUpdateSerializer,
    TutorialMediaSerializer,
)
from .permissions import IsOwnerOrReadOnly, IsOwnerOrStaff


class TutorialViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Tutorial model.

    list: Return a list of all tutorials (filtered by active status for non-owners)
    retrieve: Get a specific tutorial
    create: Create a new tutorial
    update: Update a tutorial (owner or staff only)
    partial_update: Partially update a tutorial (owner or staff only)
    destroy: Delete a tutorial (owner or staff only)
    """
    permission_classes = [IsOwnerOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['sector', 'tags', 'is_active']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'updated_at', 'title']
    ordering = ['-created_at']

    def get_queryset(self):
        """Return tutorials based on user permissions"""
        queryset = Tutorial.objects.select_related('sector', 'created_by').prefetch_related('tags')
        queryset = queryset.annotate(step_count=Count('steps'))

        # If user is not authenticated or not staff, only show active tutorials
        if not self.request.user.is_authenticated or not self.request.user.is_staff:
            queryset = queryset.filter(is_active=True)

        return queryset

    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'list':
            return TutorialListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return TutorialCreateUpdateSerializer
        return TutorialDetailSerializer


class TutorialStepViewSet(viewsets.ModelViewSet):
    """
    ViewSet for TutorialStep model.

    Allows creating, reading, updating, and deleting tutorial steps.
    """
    permission_classes = [IsAuthenticated, IsOwnerOrStaff]
    queryset = TutorialStep.objects.select_related('tutorial').prefetch_related('media').all()
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['order', 'created_at']
    ordering = ['order']

    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action in ['create', 'update', 'partial_update']:
            return TutorialStepCreateUpdateSerializer
        return TutorialStepSerializer

    def get_queryset(self):
        """Filter steps by tutorial if provided"""
        queryset = super().get_queryset()
        tutorial_id = self.request.query_params.get('tutorial')
        if tutorial_id:
            queryset = queryset.filter(tutorial_id=tutorial_id)
        return queryset

    @action(detail=False, methods=['post'], url_path='reorder')
    def reorder(self, request):
        """
        Reorder steps in a tutorial.
        Expects: { "steps": [{"id": "uuid", "order": 1}, ...] }
        """
        steps_data = request.data.get('steps', [])

        if not steps_data:
            return Response(
                {'error': 'No steps data provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update order for each step
        updated_steps = []
        for step_data in steps_data:
            step_id = step_data.get('id')
            new_order = step_data.get('order')

            try:
                step = TutorialStep.objects.get(id=step_id)

                # Check permission
                self.check_object_permissions(request, step)

                step.order = new_order
                step.save(update_fields=['order'])
                updated_steps.append(step)
            except TutorialStep.DoesNotExist:
                return Response(
                    {'error': f'Step with id {step_id} not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

        serializer = TutorialStepSerializer(updated_steps, many=True, context={'request': request})
        return Response(serializer.data)


class TutorialMediaViewSet(viewsets.ModelViewSet):
    """
    ViewSet for TutorialMedia model.

    Allows creating, reading, updating, and deleting tutorial media (images/videos).
    """
    permission_classes = [IsAuthenticated, IsOwnerOrStaff]
    queryset = TutorialMedia.objects.select_related('step__tutorial').all()
    serializer_class = TutorialMediaSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['order', 'created_at']
    ordering = ['order']

    def get_queryset(self):
        """Filter media by step if provided"""
        queryset = super().get_queryset()
        step_id = self.request.query_params.get('step')
        if step_id:
            queryset = queryset.filter(step_id=step_id)
        return queryset
