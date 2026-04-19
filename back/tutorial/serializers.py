from rest_framework import serializers
from .models import Tutorial, TutorialStep, TutorialMedia
from sectors.serializers import SectorSerializer
from tags.serializers import TagSerializer


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

    def get_media_count(self, obj):
        """Retorna a quantidade de mídias no passo"""
        return obj.media.count()


class TutorialListSerializer(serializers.ModelSerializer):
    """Serializer para listagem de tutoriais (exibição em cards)"""
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    sector_detail = SectorSerializer(source='sector', read_only=True)
    tags_detail = TagSerializer(many=True, source='tags', read_only=True)
    step_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Tutorial
        fields = [
            'id', 'title', 'description', 'sector', 'sector_detail',
            'tags', 'tags_detail', 'created_by', 'created_by_name',
            'step_count', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']


class TutorialDetailSerializer(serializers.ModelSerializer):
    """Serializer para visualização detalhada do tutorial com passos e mídias"""
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    created_by_email = serializers.CharField(source='created_by.email', read_only=True)
    sector_detail = SectorSerializer(source='sector', read_only=True)
    tags_detail = TagSerializer(many=True, source='tags', read_only=True)
    steps = TutorialStepSerializer(many=True, read_only=True)
    step_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Tutorial
        fields = [
            'id', 'title', 'description', 'sector', 'sector_detail',
            'tags', 'tags_detail', 'created_by', 'created_by_name',
            'created_by_email', 'updated_by', 'steps', 'step_count',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']


class TutorialCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer para criação e atualização de tutoriais"""

    class Meta:
        model = Tutorial
        fields = ['id', 'title', 'description', 'sector', 'tags', 'is_active']
        read_only_fields = ['id']

    def create(self, validated_data):
        """Cria tutorial com o usuário atual como criador"""
        tags = validated_data.pop('tags', [])
        validated_data['created_by'] = self.context['request'].user
        tutorial = Tutorial.objects.create(**validated_data)
        if tags:
            tutorial.tags.set(tags)
        return tutorial

    def update(self, instance, validated_data):
        """Atualiza tutorial registrando o responsável pela alteração"""
        tags = validated_data.pop('tags', None)
        validated_data['updated_by'] = self.context['request'].user

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        if tags is not None:
            instance.tags.set(tags)

        return instance


class TutorialStepCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer para criação e atualização de passos do tutorial"""

    class Meta:
        model = TutorialStep
        fields = ['id', 'tutorial', 'order', 'title', 'content']
        read_only_fields = ['id']
