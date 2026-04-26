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
from access.permissions import ContentPermission, CanManageAccess, ChildObjectPermission


class TutorialViewSet(viewsets.ModelViewSet):
    """
    ViewSet para o modelo Tutorial.

    list: Retorna lista de tutoriais (apenas ativos para não-owners)
    retrieve: Obtém um tutorial específico
    create: Cria novo tutorial
    update: Atualiza tutorial (owner ou staff)
    partial_update: Atualiza parcialmente (owner ou staff)
    destroy: Remove tutorial (owner ou staff)
    """
    permission_classes = [IsAuthenticated, ContentPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['sector', 'is_active']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'updated_at', 'title']
    ordering = ['-created_at']

    def get_queryset(self):
        """Retorna tutoriais de acordo com as permissões do usuário"""
        queryset = Tutorial.objects.select_related('sector', 'created_by').prefetch_related('tags')
        queryset = queryset.annotate(step_count=Count('steps', distinct=True))

        # Authenticated users that are not staff see only active tutorials
        if not self.request.user.is_staff:
            queryset = queryset.filter(is_active=True)

        # Filtro OR de tags: retorna tutoriais que possuam qualquer uma das tags selecionadas
        tag_ids = self.request.query_params.getlist('tags')
        tag_ids = [t for t in tag_ids if t]
        if tag_ids:
            queryset = queryset.filter(tags__id__in=tag_ids).distinct()

        return queryset

    def get_serializer_class(self):
        """Retorna o serializer adequado para cada ação"""
        if self.action == 'list':
            return TutorialListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return TutorialCreateUpdateSerializer
        return TutorialDetailSerializer

    def perform_create(self, serializer):
        from access.models import log_action
        instance = serializer.save()
        log_action(self.request.user, 'create', 'tutorial', instance, request=self.request)

    def perform_update(self, serializer):
        from access.models import log_action
        instance = serializer.save()
        log_action(self.request.user, 'update', 'tutorial', instance, request=self.request)

    def perform_destroy(self, instance):
        from access.models import log_action
        log_action(self.request.user, 'delete', 'tutorial', instance, request=self.request)
        instance.delete()

    @action(detail=True, methods=['get', 'post'], permission_classes=[IsAuthenticated, CanManageAccess])
    def share(self, request, pk=None):
        """
        GET  — lista os administradores delegados.
        POST — { "add": ["email@..."], "remove": ["email@..."] }
        """
        from django.contrib.auth import get_user_model
        from access.models import log_action

        tutorial = self.get_object()
        User = get_user_model()

        if request.method == 'GET':
            admins = tutorial.shared_admins.values('id', 'email', 'name')
            return Response({'shared_admins': list(admins)})

        errors = []
        for email in request.data.get('add', []):
            try:
                user = User.objects.get(email=email)
                if user == tutorial.created_by:
                    errors.append(f'{email} já é o dono do tutorial.')
                    continue
                tutorial.shared_admins.add(user)
                log_action(request.user, 'grant_admin', 'tutorial', tutorial,
                           {'target_user': user.email}, request)
            except User.DoesNotExist:
                errors.append(f'Usuário {email} não encontrado.')

        for email in request.data.get('remove', []):
            try:
                user = User.objects.get(email=email)
                tutorial.shared_admins.remove(user)
                log_action(request.user, 'revoke_admin', 'tutorial', tutorial,
                           {'target_user': user.email}, request)
            except User.DoesNotExist:
                pass

        admins = tutorial.shared_admins.values('id', 'email', 'name')
        data = {'shared_admins': list(admins)}
        if errors:
            data['errors'] = errors
        return Response(data)


class TutorialStepViewSet(viewsets.ModelViewSet):
    """
    ViewSet para o modelo TutorialStep.
    Permite criação, leitura, atualização e remoção de passos de tutoriais.
    """
    permission_classes = [IsAuthenticated, ChildObjectPermission]
    queryset = TutorialStep.objects.select_related('tutorial').prefetch_related('media').all()
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['order', 'created_at']
    ordering = ['order']

    def get_serializer_class(self):
        """Retorna o serializer adequado para cada ação"""
        if self.action in ['create', 'update', 'partial_update']:
            return TutorialStepCreateUpdateSerializer
        return TutorialStepSerializer

    def get_queryset(self):
        """Filtra passos por tutorial quando o parâmetro é fornecido"""
        queryset = super().get_queryset()
        tutorial_id = self.request.query_params.get('tutorial')
        if tutorial_id:
            queryset = queryset.filter(tutorial_id=tutorial_id)
        return queryset

    @action(detail=False, methods=['post'], url_path='reorder')
    def reorder(self, request):
        """
        Reordena passos de um tutorial.
        Entrada esperada: { "steps": [{"id": "uuid", "order": 1}, ...] }
        """
        from django.db import transaction

        steps_data = request.data.get('steps', [])

        if not steps_data:
            return Response(
                {'error': 'Nenhum dado de passos fornecido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validar permissões e coletar os passos antes de alterar
        step_updates = []
        for step_data in steps_data:
            step_id = step_data.get('id')
            new_order = step_data.get('order')
            try:
                step = TutorialStep.objects.get(id=step_id)
                self.check_object_permissions(request, step)
                step_updates.append((step, new_order))
            except TutorialStep.DoesNotExist:
                return Response(
                    {'error': f'Passo com id {step_id} não encontrado'},
                    status=status.HTTP_404_NOT_FOUND
                )

        # Usar ordens negativas temporárias para evitar conflito de unique_together
        with transaction.atomic():
            for step, _ in step_updates:
                step.order = -(step.order + 10000)
                step.save(update_fields=['order'])
            for step, new_order in step_updates:
                step.order = new_order
                step.save(update_fields=['order'])

        serializer = TutorialStepSerializer([s for s, _ in step_updates], many=True, context={'request': request})
        return Response(serializer.data)


class TutorialMediaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para o modelo TutorialMedia.
    Permite criação, leitura, atualização e remoção de mídias dos passos.
    """
    permission_classes = [IsAuthenticated, ChildObjectPermission]
    queryset = TutorialMedia.objects.select_related('step__tutorial').all()
    serializer_class = TutorialMediaSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['order', 'created_at']
    ordering = ['order']

    def get_queryset(self):
        """Filtra mídias por passo quando o parâmetro é fornecido"""
        queryset = super().get_queryset()
        step_id = self.request.query_params.get('step')
        if step_id:
            queryset = queryset.filter(step_id=step_id)
        return queryset
