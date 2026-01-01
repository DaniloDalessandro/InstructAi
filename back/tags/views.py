from rest_framework import viewsets, filters, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Tag
from .serializers import TagSerializer


class TagViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Tag model
    Provides CRUD operations for tags with soft delete (inativação)
    """
    queryset = Tag.objects.all().order_by('-created_at')
    serializer_class = TagSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['name']
    ordering_fields = ['name', 'created_at', 'updated_at']
    ordering = ['-created_at']

    def get_queryset(self):
        """
        Retorna queryset baseado no filtro is_active.
        Se não houver filtro, retorna apenas tags ativas por padrão.
        """
        queryset = Tag.objects.all().order_by('-created_at')
        is_active = self.request.query_params.get('is_active', None)

        # Se não especificou filtro, mostrar apenas ativos por padrão
        if is_active is None:
            queryset = queryset.filter(is_active=True)
        elif is_active.lower() in ['true', '1', 'yes']:
            queryset = queryset.filter(is_active=True)
        elif is_active.lower() in ['false', '0', 'no']:
            queryset = queryset.filter(is_active=False)
        # Se for outro valor (como "all"), retorna todos

        return queryset

    def destroy(self, request, *args, **kwargs):
        """
        Soft delete: Inativa a tag em vez de deletá-la
        """
        instance = self.get_object()
        instance.is_active = False
        instance.updated_by = request.user.email if hasattr(request, 'user') else None
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)
