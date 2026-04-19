from rest_framework import serializers
from .models import Manual
from tags.serializers import TagSerializer
from sectors.serializers import SectorSerializer


class ManualSerializer(serializers.ModelSerializer):
    """Serializer para o modelo Manual"""
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

        return manual

    def update(self, instance, validated_data):
        """Atualiza manual com auditoria e relacionamentos many-to-many"""
        sectors = validated_data.pop('sectors', None)
        tags = validated_data.pop('tags', None)

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

        return instance
