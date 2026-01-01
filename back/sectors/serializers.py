from rest_framework import serializers
from .models import Sector


class SectorSerializer(serializers.ModelSerializer):
    """Serializer for Sector model"""

    class Meta:
        model = Sector
        fields = ['id', 'name', 'is_active', 'created_at', 'updated_at', 'created_by', 'updated_by']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def create(self, validated_data):
        """Set created_by from request user"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user.email
        return super().create(validated_data)

    def update(self, instance, validated_data):
        """Set updated_by from request user"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['updated_by'] = request.user.email
        return super().update(instance, validated_data)
