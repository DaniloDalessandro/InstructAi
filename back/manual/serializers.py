from rest_framework import serializers
from .models import Manual
from tags.serializers import TagSerializer
from sectors.serializers import SectorSerializer
from tags.models import Tag


class ManualSerializer(serializers.ModelSerializer):
    """Serializer for Manual model"""
    sectors_detail = SectorSerializer(many=True, source='sectors', read_only=True)
    tags_detail = TagSerializer(many=True, source='tags', read_only=True)
    pdf_url = serializers.SerializerMethodField()

    class Meta:
        model = Manual
        fields = [
            'id', 'name', 'pdf_file', 'pdf_url', 'sectors', 'sectors_detail',
            'tags', 'tags_detail', 'is_active',
            'created_at', 'updated_at', 'created_by', 'updated_by'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'pdf_url']

    def get_pdf_url(self, obj):
        """Retorna a URL completa do PDF"""
        if obj.pdf_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.pdf_file.url)
            return obj.pdf_file.url
        return None

    def create(self, validated_data):
        """Set created_by from request user and handle many-to-many relationships"""
        # Extract many-to-many fields
        sectors = validated_data.pop('sectors', [])
        tags = validated_data.pop('tags', [])

        # Set created_by and ensure is_active is True by default
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user.email

        # ALWAYS set is_active to True for new manuals
        validated_data['is_active'] = True

        print(f"DEBUG: Creating manual with is_active={validated_data.get('is_active')}")

        # Create the manual instance
        manual = Manual.objects.create(**validated_data)

        # Set many-to-many relationships
        if sectors:
            manual.sectors.set(sectors)
        if tags:
            manual.tags.set(tags)

        print(f"DEBUG: Manual created - ID: {manual.id}, Name: {manual.name}, Active: {manual.is_active}")

        return manual

    def update(self, instance, validated_data):
        """Set updated_by from request user and handle many-to-many relationships"""
        # Extract many-to-many fields
        sectors = validated_data.pop('sectors', None)
        tags = validated_data.pop('tags', None)

        # Set updated_by
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['updated_by'] = request.user.email

        # Update regular fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update many-to-many relationships if provided
        if sectors is not None:
            instance.sectors.set(sectors)
        if tags is not None:
            instance.tags.set(tags)

        return instance
