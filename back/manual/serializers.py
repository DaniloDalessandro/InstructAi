from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field, inline_serializer
from drf_spectacular.types import OpenApiTypes
from .models import Manual
from tags.serializers import TagSerializer
from sectors.serializers import SectorSerializer
from access.permissions import get_user_permissions

_permissions_field = inline_serializer("ManualUserPermissions", {
    "can_edit": serializers.BooleanField(),
    "can_delete": serializers.BooleanField(),
    "can_manage_access": serializers.BooleanField(),
})


class ManualSerializer(serializers.ModelSerializer):
    """Serializer para o modelo Manual"""
    sectors_detail = SectorSerializer(many=True, source='sectors', read_only=True)
    tags_detail = TagSerializer(many=True, source='tags', read_only=True)
    pdf_url = serializers.SerializerMethodField()
    user_permissions = serializers.SerializerMethodField()

    # Multipart omits unchecked booleans; retain the model default on creation.
    available_for_all_sectors = serializers.BooleanField(default=True)
    availability_status = serializers.CharField(read_only=True)

    class Meta:
        model = Manual
        fields = [
            'id', 'name', 'pdf_file', 'pdf_url', 'sectors', 'sectors_detail',
            'tags', 'tags_detail', 'is_active',
            'created_at', 'updated_at', 'created_by', 'updated_by',
            'available_for_all_sectors', 'allowed_sectors', 'available_from', 'available_until',
            'availability_status', 'user_permissions',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'pdf_url', 'availability_status', 'user_permissions']

    @extend_schema_field(_permissions_field)
    def get_user_permissions(self, obj):
        request = self.context.get('request')
        if request and request.user:
            return get_user_permissions(request.user, obj)
        return {"can_edit": False, "can_delete": False, "can_manage_access": False}

    @extend_schema_field(OpenApiTypes.URI)
    def get_pdf_url(self, obj):
        """Retorna a URL completa do arquivo PDF"""
        if obj.pdf_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.pdf_file.url)
            return obj.pdf_file.url
        return None

    def create(self, validated_data):
        """Cria manual com auditoria e relacionamentos many-to-many"""
        sectors = validated_data.pop('sectors', [])
        tags = validated_data.pop('tags', [])
        allowed_sectors = validated_data.pop('allowed_sectors', [])

        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user.email

        # Novos manuais são sempre criados como ativos
        validated_data['is_active'] = True

        manual = Manual.objects.create(**validated_data)

        if sectors:
            manual.sectors.set(sectors)
        if tags:
            manual.tags.set(tags)
        manual.allowed_sectors.set(allowed_sectors)

        return manual

    def update(self, instance, validated_data):
        """Atualiza manual com auditoria e relacionamentos many-to-many"""
        sectors = validated_data.pop('sectors', None)
        tags = validated_data.pop('tags', None)
        allowed_sectors = validated_data.pop('allowed_sectors', None)

        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['updated_by'] = request.user.email

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if sectors is not None:
            instance.sectors.set(sectors)
        if tags is not None:
            instance.tags.set(tags)
        if allowed_sectors is not None:
            instance.allowed_sectors.set(allowed_sectors)

        return instance
