from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from .models import Sector
from .serializers import SectorSerializer


class SectorViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Sector model
    Provides CRUD operations for sectors
    """
    queryset = Sector.objects.all().order_by('-created_at')
    serializer_class = SectorSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['name', 'created_at', 'updated_at']
    ordering = ['-created_at']
