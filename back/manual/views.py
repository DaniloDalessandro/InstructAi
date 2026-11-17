from rest_framework import viewsets, filters, status, serializers as s
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from django.utils import timezone
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter, inline_serializer
from drf_spectacular.types import OpenApiTypes
from access.permissions import ContentPermission, CanManageAccess
from .models import Manual
from .serializers import ManualSerializer

_shared_admins_response = inline_serializer("ManualSharedAdmins", {
    "shared_admins": inline_serializer("ManualAdminInfo", {
        "id": s.IntegerField(),
        "email": s.EmailField(),
        "name": s.CharField(),
    }, many=True),
})


@extend_schema_view(
    list=extend_schema(
        tags=["Manuais"],
        summary="Lista manuais",
        parameters=[
            OpenApiParameter("tags", OpenApiTypes.INT, many=True, description="Filtra por tag (AND)"),
            OpenApiParameter("sectors", OpenApiTypes.INT, description="Filtra por setor"),
            OpenApiParameter("is_active", OpenApiTypes.BOOL, description="Filtra por status"),
            OpenApiParameter("search", OpenApiTypes.STR, description="Busca por nome"),
        ],
    ),
    retrieve=extend_schema(tags=["Manuais"], summary="Detalha manual"),
    create=extend_schema(tags=["Manuais"], summary="Faz upload de manual PDF"),
    update=extend_schema(tags=["Manuais"], summary="Atualiza manual"),
    partial_update=extend_schema(tags=["Manuais"], summary="Atualiza manual parcialmente"),
    destroy=extend_schema(tags=["Manuais"], summary="Inativa manual (soft delete)", responses={204: None}),
)
class ManualViewSet(viewsets.ModelViewSet):
    queryset = Manual.objects.all().prefetch_related('sectors', 'tags')
    serializer_class = ManualSerializer
    permission_classes = [IsAuthenticated, ContentPermission]
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active', 'sectors']
    search_fields = ['name']
    ordering_fields = ['name', 'created_at', 'updated_at']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        now = timezone.now()

        queryset = Manual.objects.all().prefetch_related('sectors', 'tags', 'allowed_sectors')
        is_active = self.request.query_params.get('is_active', None)

        # Filtro de status
        if is_active is None:
            queryset = queryset.filter(is_active=True)
        elif is_active.lower() in ['true', '1', 'yes']:
            queryset = queryset.filter(is_active=True)
        elif is_active.lower() in ['false', '0', 'no']:
            queryset = queryset.filter(is_active=False)

        # Admins veem todos
        if not (user.is_staff or user.is_superuser):
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
            owned_q = Q(owner=user) | Q(shared_admins=user)

            queryset = queryset.filter(owned_q | (sector_q & time_q)).distinct()

        # Filtro AND de tags
        tag_ids = self.request.query_params.getlist('tags')
        for tag_id in tag_ids:
            if tag_id:
                queryset = queryset.filter(tags__id=tag_id)

        return queryset.order_by('-created_at')

    def perform_create(self, serializer):
        from access.models import log_action
        instance = serializer.save(owner=self.request.user)
        log_action(self.request.user, 'create', 'manual', instance, request=self.request)

    def perform_update(self, serializer):
        from access.models import log_action
        instance = serializer.save()
        log_action(self.request.user, 'update', 'manual', instance, request=self.request)

    def destroy(self, request, *args, **kwargs):
        """Soft delete: inativa o manual em vez de deletá-lo."""
        from access.models import log_action
        instance = self.get_object()
        log_action(request.user, 'delete', 'manual', instance, request=request)
        instance.is_active = False
        instance.updated_by = request.user.email
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(
        tags=["Manuais"],
        summary="Gerencia administradores delegados do manual",
        request=inline_serializer("ManualShareRequest", {
            "add": s.ListField(child=s.EmailField(), required=False),
            "remove": s.ListField(child=s.EmailField(), required=False),
        }),
        responses={200: _shared_admins_response},
    )
    @action(detail=True, methods=['get', 'post'], permission_classes=[IsAuthenticated, CanManageAccess])
    def share(self, request, pk=None):
        from django.contrib.auth import get_user_model
        from access.models import log_action

        manual = self.get_object()
        User = get_user_model()

        if request.method == 'GET':
            admins = manual.shared_admins.values('id', 'email', 'name')
            return Response({'shared_admins': list(admins)})

        errors = []
        for email in request.data.get('add', []):
            try:
                user = User.objects.get(email=email)
                if user == manual.owner:
                    errors.append(f'{email} já é o dono do manual.')
                    continue
                manual.shared_admins.add(user)
                log_action(request.user, 'grant_admin', 'manual', manual,
                           {'target_user': user.email}, request)
            except User.DoesNotExist:
                errors.append(f'Usuário {email} não encontrado.')

        for email in request.data.get('remove', []):
            try:
                user = User.objects.get(email=email)
                manual.shared_admins.remove(user)
                log_action(request.user, 'revoke_admin', 'manual', manual,
                           {'target_user': user.email}, request)
            except User.DoesNotExist:
                pass

        admins = manual.shared_admins.values('id', 'email', 'name')
        data = {'shared_admins': list(admins)}
        if errors:
            data['errors'] = errors
        return Response(data)
