from rest_framework import serializers
from .models import Tag


class TagSerializer(serializers.ModelSerializer):
    """Serializer para o modelo Tag"""

    class Meta:
        model = Tag
        fields = ['id', 'name', 'color', 'is_active', 'created_at', 'updated_at', 'created_by', 'updated_by']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def create(self, validated_data):
        """Define created_by com o usuário da requisição"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user.email
        return super().create(validated_data)

    def update(self, instance, validated_data):
        """Define updated_by com o usuário da requisição"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['updated_by'] = request.user.email
        return super().update(instance, validated_data)
