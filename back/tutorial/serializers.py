from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field, inline_serializer
from drf_spectacular.types import OpenApiTypes
from .models import Tutorial, TutorialStep, TutorialMedia
from sectors.serializers import SectorSerializer
from tags.serializers import TagSerializer
from access.permissions import get_user_permissions

_permissions_field = inline_serializer("TutorialUserPermissions", {
    "can_edit": serializers.BooleanField(),
    "can_delete": serializers.BooleanField(),
    "can_manage_access": serializers.BooleanField(),
})


class TutorialMediaSerializer(serializers.ModelSerializer):
    """Serializer para mídias do tutorial (imagens e vídeos)"""
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = TutorialMedia
        fields = [
            'id', 'step', 'media_type', 'file', 'file_url', 'embed_url',
            'caption', 'annotations', 'order', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    @extend_schema_field(OpenApiTypes.URI)
    def get_file_url(self, obj):
        """Retorna a URL completa do arquivo"""
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class TutorialStepSerializer(serializers.ModelSerializer):
    """Serializer para passo do tutorial com mídias aninhadas"""
    media = TutorialMediaSerializer(many=True, read_only=True)
    media_count = serializers.SerializerMethodField()

    class Meta:
        model = TutorialStep
        fields = [
            'id', 'tutorial', 'order', 'title', 'content',
            'media', 'media_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    @extend_schema_field(OpenApiTypes.INT)
    def get_media_count(self, obj):
        """Retorna a quantidade de mídias no passo"""
        return obj.media.count()


class TutorialListSerializer(serializers.ModelSerializer):
    """Serializer para listagem de tutoriais (exibição em cards)"""
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    sector_detail = SectorSerializer(source='sector', read_only=True)
    tags_detail = TagSerializer(many=True, source='tags', read_only=True)
    step_count = serializers.IntegerField(read_only=True)
    user_permissions = serializers.SerializerMethodField()

    class Meta:
        model = Tutorial
        fields = [
            'id', 'title', 'description', 'sector', 'sector_detail',
            'tags', 'tags_detail', 'created_by', 'created_by_name',
            'step_count', 'is_active', 'created_at', 'updated_at',
            'available_for_all_sectors', 'allowed_sectors', 'available_from', 'available_until',
            'availability_status', 'user_permissions',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at', 'availability_status', 'user_permissions']

    @extend_schema_field(_permissions_field)
    def get_user_permissions(self, obj) -> dict[str, bool]:
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            return get_user_permissions(request.user, obj)
        return {"can_edit": False, "can_delete": False, "can_manage_access": False}


class TutorialDetailSerializer(serializers.ModelSerializer):
    """Serializer para visualização detalhada do tutorial com passos e mídias"""
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    created_by_email = serializers.CharField(source='created_by.email', read_only=True)
    sector_detail = SectorSerializer(source='sector', read_only=True)
    tags_detail = TagSerializer(many=True, source='tags', read_only=True)
    steps = TutorialStepSerializer(many=True, read_only=True)
    step_count = serializers.IntegerField(read_only=True)
    user_permissions = serializers.SerializerMethodField()

    class Meta:
        model = Tutorial
        fields = [
            'id', 'title', 'description', 'sector', 'sector_detail',
            'tags', 'tags_detail', 'created_by', 'created_by_name',
            'created_by_email', 'updated_by', 'steps', 'step_count',
            'is_active', 'created_at', 'updated_at',
            'available_for_all_sectors', 'allowed_sectors', 'available_from', 'available_until',
            'availability_status', 'user_permissions',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at', 'availability_status', 'user_permissions']

    @extend_schema_field(_permissions_field)
    def get_user_permissions(self, obj) -> dict[str, bool]:
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            return get_user_permissions(request.user, obj)
        return {"can_edit": False, "can_delete": False, "can_manage_access": False}


class TutorialCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer para criação e atualização de tutoriais"""

    class Meta:
        model = Tutorial
        fields = [
            'id', 'title', 'description', 'sector', 'tags', 'is_active',
            'available_for_all_sectors', 'allowed_sectors', 'available_from', 'available_until',
        ]
        read_only_fields = ['id']

    def create(self, validated_data):
        """Cria tutorial com o usuário atual como criador"""
        tags = validated_data.pop('tags', [])
        allowed_sectors = validated_data.pop('allowed_sectors', [])
        validated_data['created_by'] = self.context['request'].user
        tutorial = Tutorial.objects.create(**validated_data)
        if tags:
            tutorial.tags.set(tags)
        tutorial.allowed_sectors.set(allowed_sectors)
        return tutorial

    def update(self, instance, validated_data):
        """Atualiza tutorial registrando o responsável pela alteração"""
        tags = validated_data.pop('tags', None)
        allowed_sectors = validated_data.pop('allowed_sectors', None)
        validated_data['updated_by'] = self.context['request'].user

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        if tags is not None:
            instance.tags.set(tags)
        if allowed_sectors is not None:
            instance.allowed_sectors.set(allowed_sectors)

        return instance


class TutorialStepCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer para criação e atualização de passos do tutorial"""

    class Meta:
        model = TutorialStep
        fields = ['id', 'tutorial', 'order', 'title', 'content']
        read_only_fields = ['id']
