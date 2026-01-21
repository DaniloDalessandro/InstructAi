from rest_framework import serializers
from django.conf import settings
from .models import Tutorial, TutorialStep, TutorialMedia
from sectors.serializers import SectorSerializer
from tags.serializers import TagSerializer


class TutorialMediaSerializer(serializers.ModelSerializer):
    """Serializer for Tutorial Media (images/videos)"""
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = TutorialMedia
        fields = [
            'id', 'step', 'media_type', 'file', 'file_url', 'embed_url',
            'caption', 'annotations', 'order', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_file_url(self, obj):
        """Return the full URL for the file"""
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class TutorialStepSerializer(serializers.ModelSerializer):
    """Serializer for Tutorial Step with nested media"""
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
        """Return the number of media items in this step"""
        return obj.media.count()


class TutorialListSerializer(serializers.ModelSerializer):
    """Serializer for listing tutorials (card display)"""
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
    """Serializer for detailed tutorial view with all steps and media"""
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
    """Serializer for creating/updating tutorials"""

    class Meta:
        model = Tutorial
        fields = ['id', 'title', 'description', 'sector', 'tags', 'is_active']
        read_only_fields = ['id']

    def create(self, validated_data):
        """Create tutorial with current user as creator"""
        tags = validated_data.pop('tags', [])
        validated_data['created_by'] = self.context['request'].user
        tutorial = Tutorial.objects.create(**validated_data)
        if tags:
            tutorial.tags.set(tags)
        return tutorial

    def update(self, instance, validated_data):
        """Update tutorial"""
        tags = validated_data.pop('tags', None)

        # Update updated_by field
        validated_data['updated_by'] = self.context['request'].user

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        if tags is not None:
            instance.tags.set(tags)

        return instance


class TutorialStepCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating tutorial steps"""

    class Meta:
        model = TutorialStep
        fields = ['id', 'tutorial', 'order', 'title', 'content']
        read_only_fields = ['id']
