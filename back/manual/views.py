from rest_framework import viewsets, filters, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from .models import Manual
from .serializers import ManualSerializer


class ManualViewSet(viewsets.ModelViewSet):
    """
    ViewSet para o modelo Manual.
    Fornece operações CRUD com upload de arquivo PDF e soft delete (inativação).
    """
    queryset = Manual.objects.all().prefetch_related('sectors', 'tags')
    serializer_class = ManualSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active', 'sectors']
    search_fields = ['name']
    ordering_fields = ['name', 'created_at', 'updated_at']
    ordering = ['-created_at']

    def get_queryset(self):
        """
        Retorna queryset baseado nos filtros.
        Tags são filtradas cumulativamente (AND): um manual precisa ter TODAS as tags
        marcadas para aparecer no resultado.
        Se não houver filtro is_active, retorna apenas manuais ativos por padrão.
        """
        queryset = Manual.objects.all().prefetch_related('sectors', 'tags')
        is_active = self.request.query_params.get('is_active', None)

        # Filtro de status
        if is_active is None:
            queryset = queryset.filter(is_active=True)
        elif is_active.lower() in ['true', '1', 'yes']:
            queryset = queryset.filter(is_active=True)
        elif is_active.lower() in ['false', '0', 'no']:
            queryset = queryset.filter(is_active=False)

        # Filtro AND de tags: encadeia um filter por tag para garantir
        # que o manual tenha TODAS as tags selecionadas
        tag_ids = self.request.query_params.getlist('tags')
        for tag_id in tag_ids:
            if tag_id:
                queryset = queryset.filter(tags__id=tag_id)

        return queryset.order_by('-created_at')

    def destroy(self, request, *args, **kwargs):
        """
        Soft delete: Inativa o manual em vez de deletá-lo
        """
        instance = self.get_object()
        instance.is_active = False
        instance.updated_by = request.user.email if hasattr(request, 'user') else None
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)
