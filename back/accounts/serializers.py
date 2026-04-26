from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import CustomUser


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'email', 'name', 'date_joined']
        read_only_fields = ['id', 'date_joined']


class UserProfileSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()
    sector_name = serializers.CharField(source='sector.name', read_only=True)

    class Meta:
        model = CustomUser
        fields = [
            'id', 'email', 'name', 'phone', 'position', 'cpf',
            'sector', 'sector_name', 'avatar', 'avatar_url',
            'is_superuser', 'date_joined',
        ]
        read_only_fields = ['id', 'email', 'is_superuser', 'date_joined', 'sector_name']

    def get_avatar_url(self, obj):
        if obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
        return None


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer para alteração de senha do usuário autenticado."""
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, min_length=8)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Senha atual incorreta.')
        return value

    def validate_new_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError('A nova senha deve ter pelo menos 8 caracteres.')
        return value

    def save(self):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = 'email'

    def validate(self, attrs):
        data = super().validate(attrs)

        # Inclui dados básicos do usuário no response do login
        data['user'] = {
            'id': str(self.user.id),
            'email': self.user.email,
            'name': self.user.name,
            'is_superuser': self.user.is_superuser,
        }

        return data
