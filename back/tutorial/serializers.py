from rest_framework import serializers
from django.conf import settings
from .models import KnowledgeArea, TutorialTag, Tutorial, TutorialStep, TutorialMedia


class KnowledgeAreaSerializer(serializers.ModelSerializer):
    """Serializer for Knowledge Area"""

    class Meta:
        model = KnowledgeArea
        fields = ['id', 'name', 'description', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class TutorialTagSerializer(serializers.ModelSerializer):
    """Serializer for Tutorial Tag"""

    class Meta:
        model = TutorialTag
        fields = ['id', 'name', 'created_at']
        read_only_fields = ['id', 'created_at']


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

    def validate(self, data):
        """Validate that file or embed_url is provided based on media_type"""
        media_type = data.get('media_type')
        file = data.get('file')
        embed_url = data.get('embed_url')

        if media_type in ['image', 'video_upload'] and not file:
            raise serializers.ValidationError({
                'file': 'Arquivo é obrigatório para este tipo de mídia.'
            })

        if media_type == 'video_embed' and not embed_url:
            raise serializers.ValidationError({
                'embed_url': 'URL de embed é obrigatória para vídeos incorporados.'
            })

        # Validate file type if file is provided
        if file and media_type == 'image':
            if file.content_type not in settings.ALLOWED_IMAGE_TYPES:
                raise serializers.ValidationError({
                    'file': f'Tipo de arquivo não permitido. Tipos aceitos: {", ".join(settings.ALLOWED_IMAGE_TYPES)}'
                })

        if file and media_type == 'video_upload':
            if file.content_type not in settings.ALLOWED_VIDEO_TYPES:
                raise serializers.ValidationError({
                    'file': f'Tipo de arquivo não permitido. Tipos aceitos: {", ".join(settings.ALLOWED_VIDEO_TYPES)}'
                })

        return data


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


class TutorialStepCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating tutorial steps (without nested media)"""

    class Meta:
        model = TutorialStep
        fields = ['id', 'tutorial', 'order', 'title', 'content']
        read_only_fields = ['id']


class TutorialListSerializer(serializers.ModelSerializer):
    """Serializer for listing tutorials (card display)"""
    author_name = serializers.CharField(source='author.name', read_only=True)
    knowledge_area_name = serializers.CharField(source='knowledge_area.name', read_only=True)
    tags = TutorialTagSerializer(many=True, read_only=True)
    step_count = serializers.IntegerField(read_only=True)
    thumbnail = serializers.SerializerMethodField()

    class Meta:
        model = Tutorial
        fields = [
            'id', 'title', 'description', 'author', 'author_name',
            'knowledge_area', 'knowledge_area_name', 'difficulty_level',
            'estimated_time', 'is_published', 'tags', 'step_count',
            'thumbnail', 'created_at', 'published_at'
        ]
        read_only_fields = ['id', 'author', 'created_at', 'published_at']

    def get_thumbnail(self, obj):
        """Return URL of the first image in the tutorial, or None"""
        first_step = obj.steps.first()
        if first_step:
            first_media = first_step.media.filter(media_type='image').first()
            if first_media and first_media.file:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(first_media.file.url)
                return first_media.file.url
        return None


class TutorialDetailSerializer(serializers.ModelSerializer):
    """Serializer for detailed tutorial view with all steps and media"""
    author_name = serializers.CharField(source='author.name', read_only=True)
    author_email = serializers.CharField(source='author.email', read_only=True)
    knowledge_area = KnowledgeAreaSerializer(read_only=True)
    tags = TutorialTagSerializer(many=True, read_only=True)
    steps = TutorialStepSerializer(many=True, read_only=True)
    step_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Tutorial
        fields = [
            'id', 'title', 'description', 'author', 'author_name', 'author_email',
            'knowledge_area', 'difficulty_level', 'estimated_time', 'is_published',
            'tags', 'steps', 'step_count', 'created_at', 'updated_at', 'published_at'
        ]
        read_only_fields = ['id', 'author', 'created_at', 'updated_at', 'published_at']


class TutorialCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating tutorials"""
    tags = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=TutorialTag.objects.all(),
        required=False
    )

    class Meta:
        model = Tutorial
        fields = [
            'id', 'title', 'description', 'knowledge_area', 'difficulty_level',
            'estimated_time', 'tags'
        ]
        read_only_fields = ['id']

    def create(self, validated_data):
        """Create tutorial with current user as author"""
        tags = validated_data.pop('tags', [])
        validated_data['author'] = self.context['request'].user
        tutorial = Tutorial.objects.create(**validated_data)
        if tags:
            tutorial.tags.set(tags)
        return tutorial

    def update(self, instance, validated_data):
        """Update tutorial"""
        tags = validated_data.pop('tags', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        if tags is not None:
            instance.tags.set(tags)

        return instance


class TutorialPublishSerializer(serializers.Serializer):
    """Serializer for publishing/unpublishing tutorials"""
    is_published = serializers.BooleanField()

    def validate_is_published(self, value):
        """Validate that tutorial has at least one step before publishing"""
        tutorial = self.instance
        if value and tutorial.steps.count() == 0:
            raise serializers.ValidationError(
                "Tutorial deve ter pelo menos um passo antes de ser publicado."
            )
        return value

    def update(self, instance, validated_data):
        """Publish or unpublish tutorial"""
        if validated_data['is_published']:
            instance.publish()
        else:
            instance.unpublish()
        return instance
