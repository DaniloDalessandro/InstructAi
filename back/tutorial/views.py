from rest_framework import viewsets, filters, status, serializers as s
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import rest_framework as django_filters
from django.db.models import Count, Q
from django.utils import timezone
from drf_spectacular.utils import (
    extend_schema, extend_schema_view, OpenApiParameter, OpenApiResponse, inline_serializer,
)
from drf_spectacular.types import OpenApiTypes

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

_shared_admins_response = inline_serializer("SharedAdmins", {
    "shared_admins": inline_serializer("AdminInfo", {
        "id": s.IntegerField(),
        "email": s.EmailField(),
        "name": s.CharField(),
    }, many=True),
})


class NumberInFilter(django_filters.BaseInFilter, django_filters.NumberFilter):
    pass


class TutorialFilter(django_filters.FilterSet):
    sector = NumberInFilter(field_name='sector_id', lookup_expr='in')

    class Meta:
        model = Tutorial
        fields = ['sector', 'is_active']


@extend_schema_view(
    list=extend_schema(
        tags=["Tutoriais"],
        summary="Lista tutoriais",
        parameters=[
            OpenApiParameter("tags", OpenApiTypes.INT, many=True, description="Filtra por tag (pode repetir)"),
            OpenApiParameter("sector", OpenApiTypes.INT, description="Filtra por setor"),
            OpenApiParameter("is_active", OpenApiTypes.BOOL, description="Filtra por status"),
            OpenApiParameter("search", OpenApiTypes.STR, description="Busca por título ou descrição"),
        ],
    ),
    retrieve=extend_schema(tags=["Tutoriais"], summary="Detalha tutorial"),
    create=extend_schema(tags=["Tutoriais"], summary="Cria tutorial"),
    update=extend_schema(tags=["Tutoriais"], summary="Atualiza tutorial"),
    partial_update=extend_schema(tags=["Tutoriais"], summary="Atualiza tutorial parcialmente"),
    destroy=extend_schema(tags=["Tutoriais"], summary="Remove tutorial"),
)
class TutorialViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, ContentPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = TutorialFilter
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'updated_at', 'title']
    ordering = ['-created_at']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Tutorial.objects.none()
        user = self.request.user
        now = timezone.now()

        queryset = (
            Tutorial.objects
            .select_related('sector', 'created_by')
            .prefetch_related('tags', 'allowed_sectors')
            .annotate(step_count=Count('steps', distinct=True))
        )

        # Admins veem tudo (inclusive inativos se solicitado)
        if user.is_staff or user.is_superuser:
            tag_ids = self.request.query_params.getlist('tags')
            tag_ids = [t for t in tag_ids if t]
            if tag_ids:
                queryset = queryset.filter(tags__id__in=tag_ids).distinct()
            return queryset

        # Usuários comuns só veem ativos
        queryset = queryset.filter(is_active=True)

        # Filtro de setor
        user_sector_id = getattr(user, 'sector_id', None)
        if user_sector_id:
            sector_q = Q(available_for_all_sectors=True) | Q(allowed_sectors=user_sector_id)
        else:
            sector_q = Q(available_for_all_sectors=True)

        # Filtro de período
        time_q = (
            Q(available_from__isnull=True) | Q(available_from__lte=now)
        ) & (
            Q(available_until__isnull=True) | Q(available_until__gte=now)
        )

        # Owners e shared_admins bypassam filtros de setor/data
        owned_q = Q(created_by=user) | Q(shared_admins=user)

        queryset = queryset.filter(owned_q | (sector_q & time_q)).distinct()

        # Filtro OR de tags
        tag_ids = self.request.query_params.getlist('tags')
        tag_ids = [t for t in tag_ids if t]
        if tag_ids:
            queryset = queryset.filter(tags__id__in=tag_ids).distinct()

        return queryset

    def get_serializer_class(self):
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

    @extend_schema(
        tags=["Tutoriais"],
        summary="Gerencia administradores delegados do tutorial",
        description="GET retorna lista; POST aceita `{\"add\": [...], \"remove\": [...]}` com e-mails.",
        request=inline_serializer("ShareRequest", {
            "add": s.ListField(child=s.EmailField(), required=False),
            "remove": s.ListField(child=s.EmailField(), required=False),
        }),
        responses={200: _shared_admins_response},
    )
    @action(detail=True, methods=['get', 'post'], permission_classes=[IsAuthenticated, CanManageAccess])
    def share(self, request, pk=None):
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


@extend_schema_view(
    list=extend_schema(
        tags=["Tutoriais"],
        summary="Lista passos de tutorial",
        parameters=[OpenApiParameter("tutorial", OpenApiTypes.UUID, description="Filtra por tutorial")],
    ),
    retrieve=extend_schema(tags=["Tutoriais"], summary="Detalha passo"),
    create=extend_schema(tags=["Tutoriais"], summary="Cria passo de tutorial"),
    update=extend_schema(tags=["Tutoriais"], summary="Atualiza passo"),
    partial_update=extend_schema(tags=["Tutoriais"], summary="Atualiza passo parcialmente"),
    destroy=extend_schema(tags=["Tutoriais"], summary="Remove passo"),
)
class TutorialStepViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, ChildObjectPermission]
    queryset = TutorialStep.objects.select_related('tutorial').prefetch_related('media').all()
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['order', 'created_at']
    ordering = ['order']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return TutorialStepCreateUpdateSerializer
        return TutorialStepSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        tutorial_id = self.request.query_params.get('tutorial')
        if tutorial_id:
            queryset = queryset.filter(tutorial_id=tutorial_id)
        return queryset

    @extend_schema(
        tags=["Tutoriais"],
        summary="Reordena passos de um tutorial",
        request=inline_serializer("ReorderRequest", {
            "steps": inline_serializer("StepOrder", {
                "id": s.UUIDField(),
                "order": s.IntegerField(),
            }, many=True),
        }),
        responses={200: TutorialStepSerializer(many=True)},
    )
    @action(detail=False, methods=['post'], url_path='reorder')
    def reorder(self, request):
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


@extend_schema_view(
    list=extend_schema(
        tags=["Tutoriais"],
        summary="Lista mídias de passos",
        parameters=[OpenApiParameter("step", OpenApiTypes.UUID, description="Filtra por passo")],
    ),
    retrieve=extend_schema(tags=["Tutoriais"], summary="Detalha mídia"),
    create=extend_schema(tags=["Tutoriais"], summary="Faz upload de mídia"),
    update=extend_schema(tags=["Tutoriais"], summary="Atualiza mídia"),
    partial_update=extend_schema(tags=["Tutoriais"], summary="Atualiza mídia parcialmente"),
    destroy=extend_schema(tags=["Tutoriais"], summary="Remove mídia"),
)
class TutorialMediaViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, ChildObjectPermission]
    queryset = TutorialMedia.objects.select_related('step__tutorial').all()
    serializer_class = TutorialMediaSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['order', 'created_at']
    ordering = ['order']

    def get_queryset(self):
        queryset = super().get_queryset()
        step_id = self.request.query_params.get('step')
        if step_id:
            queryset = queryset.filter(step_id=step_id)
        return queryset
