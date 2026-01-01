from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.db.models import Max
from .models import KnowledgeArea, TutorialTag, Tutorial, TutorialStep, TutorialMedia
from .serializers import (
    KnowledgeAreaSerializer,
    TutorialTagSerializer,
    TutorialListSerializer,
    TutorialDetailSerializer,
    TutorialCreateUpdateSerializer,
    TutorialPublishSerializer,
    TutorialStepSerializer,
    TutorialStepCreateUpdateSerializer,
    TutorialMediaSerializer,
)
from .permissions import IsAuthorOrStaffOrReadOnly, IsStaffOrReadOnly, IsAuthorOrStaff


class KnowledgeAreaViewSet(viewsets.ModelViewSet):
    """ViewSet for Knowledge Areas"""
    queryset = KnowledgeArea.objects.all()
    serializer_class = KnowledgeAreaSerializer
    permission_classes = [IsStaffOrReadOnly]

    def get_queryset(self):
        """Order by name"""
        return KnowledgeArea.objects.all().order_by('name')


class TutorialTagViewSet(viewsets.ModelViewSet):
    """ViewSet for Tutorial Tags"""
    queryset = TutorialTag.objects.all()
    serializer_class = TutorialTagSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Order by name"""
        return TutorialTag.objects.all().order_by('name')


class TutorialViewSet(viewsets.ModelViewSet):
    """ViewSet for Tutorials"""
    permission_classes = [IsAuthorOrStaffOrReadOnly]

    def get_queryset(self):
        """
        Filter tutorials based on user permissions.
        - Staff: see all tutorials
        - Authors: see own tutorials
        - Others: see only published tutorials
        """
        queryset = Tutorial.objects.prefetch_related('tags', 'steps', 'knowledge_area', 'author')

        if self.request.user.is_staff:
            # Staff can see all tutorials
            return queryset.all()
        elif self.request.user.is_authenticated:
            # Authenticated users can see published tutorials and their own
            from django.db.models import Q
            return queryset.filter(
                Q(is_published=True) | Q(author=self.request.user)
            )
        else:
            # Anonymous users can only see published tutorials
            return queryset.filter(is_published=True)

    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'list':
            return TutorialListSerializer
        elif self.action == 'retrieve':
            return TutorialDetailSerializer
        elif self.action in ['publish', 'unpublish']:
            return TutorialPublishSerializer
        else:
            return TutorialCreateUpdateSerializer

    def perform_create(self, serializer):
        """Set the author to the current user"""
        serializer.save(author=self.request.user)

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        """Publish a tutorial"""
        tutorial = self.get_object()

        # Check permissions
        if tutorial.author != request.user and not request.user.is_staff:
            return Response(
                {'detail': 'Você não tem permissão para publicar este tutorial.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Validate tutorial has at least one step
        if tutorial.steps.count() == 0:
            return Response(
                {'detail': 'Tutorial deve ter pelo menos um passo antes de ser publicado.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Publish the tutorial
        tutorial.publish()

        serializer = self.get_serializer(tutorial)
        return Response({
            'detail': 'Tutorial publicado com sucesso!',
            'tutorial': TutorialDetailSerializer(tutorial, context={'request': request}).data
        })

    @action(detail=True, methods=['post'])
    def unpublish(self, request, pk=None):
        """Unpublish a tutorial"""
        tutorial = self.get_object()

        # Check permissions
        if tutorial.author != request.user and not request.user.is_staff:
            return Response(
                {'detail': 'Você não tem permissão para despublicar este tutorial.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Unpublish the tutorial
        tutorial.unpublish()

        return Response({
            'detail': 'Tutorial despublicado com sucesso!',
            'tutorial': TutorialDetailSerializer(tutorial, context={'request': request}).data
        })

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """Duplicate a tutorial as a draft"""
        original = self.get_object()

        with transaction.atomic():
            # Create new tutorial
            new_tutorial = Tutorial.objects.create(
                title=f"{original.title} (Cópia)",
                description=original.description,
                knowledge_area=original.knowledge_area,
                author=request.user,
                difficulty_level=original.difficulty_level,
                estimated_time=original.estimated_time,
                is_published=False
            )

            # Copy tags
            new_tutorial.tags.set(original.tags.all())

            # Copy steps
            for step in original.steps.all():
                new_step = TutorialStep.objects.create(
                    tutorial=new_tutorial,
                    order=step.order,
                    title=step.title,
                    content=step.content
                )

                # Copy media
                for media in step.media.all():
                    TutorialMedia.objects.create(
                        step=new_step,
                        media_type=media.media_type,
                        file=media.file,
                        embed_url=media.embed_url,
                        caption=media.caption,
                        annotations=media.annotations,
                        order=media.order
                    )

        return Response({
            'detail': 'Tutorial duplicado com sucesso!',
            'tutorial': TutorialDetailSerializer(new_tutorial, context={'request': request}).data
        }, status=status.HTTP_201_CREATED)


class TutorialStepViewSet(viewsets.ModelViewSet):
    """ViewSet for Tutorial Steps (nested under tutorials)"""
    permission_classes = [IsAuthorOrStaff]

    def get_queryset(self):
        """Filter steps by tutorial"""
        tutorial_pk = self.kwargs.get('tutorial_pk')
        if tutorial_pk:
            return TutorialStep.objects.filter(tutorial_id=tutorial_pk).order_by('order')
        return TutorialStep.objects.all().order_by('order')

    def get_serializer_class(self):
        """Return appropriate serializer"""
        if self.action in ['create', 'update', 'partial_update']:
            return TutorialStepCreateUpdateSerializer
        return TutorialStepSerializer

    def perform_create(self, serializer):
        """Set the tutorial when creating a step"""
        tutorial_pk = self.kwargs.get('tutorial_pk')
        tutorial = Tutorial.objects.get(pk=tutorial_pk)

        # Check permission
        if tutorial.author != self.request.user and not self.request.user.is_staff:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Você não tem permissão para adicionar passos a este tutorial.')

        # Auto-increment order if not provided
        if 'order' not in serializer.validated_data or serializer.validated_data['order'] is None:
            max_order = tutorial.steps.aggregate(Max('order'))['order__max'] or 0
            serializer.save(tutorial=tutorial, order=max_order + 1)
        else:
            serializer.save(tutorial=tutorial)

    def perform_destroy(self, instance):
        """Delete step and reorder remaining steps"""
        tutorial = instance.tutorial
        deleted_order = instance.order

        # Delete the step
        instance.delete()

        # Reorder remaining steps
        steps_to_reorder = tutorial.steps.filter(order__gt=deleted_order)
        for step in steps_to_reorder:
            step.order -= 1
            step.save()

    @action(detail=False, methods=['post'])
    def reorder(self, request, tutorial_pk=None):
        """Reorder tutorial steps"""
        # Expected payload: [{'id': 'uuid', 'order': 1}, {'id': 'uuid', 'order': 2}, ...]
        new_order = request.data.get('steps', [])

        if not new_order:
            return Response(
                {'detail': 'Lista de passos é obrigatória.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            for item in new_order:
                step_id = item.get('id')
                order = item.get('order')

                if not step_id or order is None:
                    return Response(
                        {'detail': 'Cada passo deve ter id e order.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                try:
                    step = TutorialStep.objects.get(pk=step_id, tutorial_id=tutorial_pk)
                    step.order = order
                    step.save()
                except TutorialStep.DoesNotExist:
                    return Response(
                        {'detail': f'Passo {step_id} não encontrado.'},
                        status=status.HTTP_404_NOT_FOUND
                    )

        return Response({'detail': 'Passos reordenados com sucesso!'})


class TutorialMediaViewSet(viewsets.ModelViewSet):
    """ViewSet for Tutorial Media (nested under steps)"""
    serializer_class = TutorialMediaSerializer
    permission_classes = [IsAuthorOrStaff]

    def get_queryset(self):
        """Filter media by step"""
        step_pk = self.kwargs.get('step_pk')
        if step_pk:
            return TutorialMedia.objects.filter(step_id=step_pk).order_by('order')
        return TutorialMedia.objects.all().order_by('order')

    def perform_create(self, serializer):
        """Set the step when creating media"""
        step_pk = self.kwargs.get('step_pk')
        step = TutorialStep.objects.get(pk=step_pk)

        # Check permission
        if step.tutorial.author != self.request.user and not self.request.user.is_staff:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Você não tem permissão para adicionar mídia a este passo.')

        # Auto-increment order if not provided
        if 'order' not in serializer.validated_data or serializer.validated_data['order'] is None:
            max_order = step.media.aggregate(Max('order'))['order__max'] or 0
            serializer.save(step=step, order=max_order + 1)
        else:
            serializer.save(step=step)

    @action(detail=True, methods=['patch'])
    def update_annotations(self, request, pk=None, **kwargs):
        """Update only the annotations field of a media item"""
        media = self.get_object()
        annotations = request.data.get('annotations')

        if annotations is None:
            return Response(
                {'detail': 'Anotações são obrigatórias.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        media.annotations = annotations
        media.save()

        serializer = self.get_serializer(media)
        return Response({
            'detail': 'Anotações atualizadas com sucesso!',
            'media': serializer.data
        })
