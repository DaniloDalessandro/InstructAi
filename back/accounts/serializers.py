from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from .models import CustomUser, UserInvitation
from sectors.models import Sector


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
            'is_staff', 'is_superuser', 'date_joined', 'must_change_password',
        ]
        read_only_fields = ['id', 'email', 'is_superuser', 'date_joined', 'sector_name', 'must_change_password']

    def get_avatar_url(self, obj: CustomUser) -> str | None:
        if obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
        return None


class UserAdminSerializer(serializers.ModelSerializer):
    """Serializer completo para listagem/gestão de usuários pelo admin."""
    sector_name = serializers.CharField(source='sector.name', read_only=True)
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = [
            'id', 'email', 'name', 'phone', 'position', 'cpf',
            'sector', 'sector_name', 'avatar_url',
            'is_staff', 'is_superuser', 'is_active',
            'must_change_password', 'date_joined',
        ]
        read_only_fields = ['id', 'date_joined', 'sector_name', 'avatar_url']

    def get_avatar_url(self, obj: CustomUser) -> str | None:
        if obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
        return None


class ManualUserCreateSerializer(serializers.Serializer):
    """Cria um usuário manualmente com senha temporária."""
    email = serializers.EmailField()
    name = serializers.CharField(max_length=255)
    cpf = serializers.CharField(max_length=14, required=False, allow_blank=True, default='')
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')
    position = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    sector = serializers.PrimaryKeyRelatedField(
        queryset=Sector.objects.all(),
        required=False, allow_null=True
    )
    is_staff = serializers.BooleanField(default=False)
    is_superuser = serializers.BooleanField(default=False)
    is_active = serializers.BooleanField(default=True)

    def validate_email(self, value):
        if CustomUser.objects.filter(email=value).exists():
            raise serializers.ValidationError('Já existe um usuário com este e-mail.')
        return value


class UserInvitationSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    is_valid = serializers.BooleanField(read_only=True)
    status = serializers.SerializerMethodField()

    def get_status(self, obj):
        if obj.status == UserInvitation.STATUS_PENDING and not obj.is_valid:
            return UserInvitation.STATUS_EXPIRED
        return obj.status

    class Meta:
        model = UserInvitation
        fields = [
            'id', 'email', 'token', 'status', 'is_valid',
            'created_by', 'created_by_name', 'created_at', 'expires_at', 'used_at',
        ]
        read_only_fields = ['id', 'token', 'status', 'created_by', 'created_by_name',
                            'created_at', 'expires_at', 'used_at', 'is_valid']


class CreateInvitationSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        if CustomUser.objects.filter(email=value).exists():
            raise serializers.ValidationError('Já existe um usuário com este e-mail.')
        # Cancela convites pendentes anteriores para este e-mail
        UserInvitation.objects.filter(
            email=value,
            status=UserInvitation.STATUS_PENDING,
        ).update(status=UserInvitation.STATUS_CANCELLED)
        return value


class CompleteRegistrationSerializer(serializers.Serializer):
    """Completa o cadastro via token de convite."""
    token = serializers.CharField()
    name = serializers.CharField(max_length=255)
    cpf = serializers.CharField(max_length=14, required=False, allow_blank=True, default='')
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')
    position = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    sector = serializers.PrimaryKeyRelatedField(
        queryset=Sector.objects.all(),
        required=False, allow_null=True
    )
    password = serializers.CharField(min_length=8, write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'As senhas não coincidem.'})
        try:
            validate_password(data['password'])
        except Exception as e:
            raise serializers.ValidationError({'password': list(e.messages)})

        invitation = UserInvitation.objects.filter(token=data['token']).first()
        if not invitation:
            raise serializers.ValidationError({'token': 'Convite inválido.'})
        if not invitation.is_valid:
            raise serializers.ValidationError({'token': 'Este convite expirou ou já foi utilizado.'})

        data['invitation'] = invitation
        return data


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
        user.must_change_password = False
        user.save()
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = 'email'

    def validate(self, attrs):
        data = super().validate(attrs)

        data['user'] = {
            'id': str(self.user.id),
            'email': self.user.email,
            'name': self.user.name,
            'is_staff': self.user.is_staff,
            'is_superuser': self.user.is_superuser,
            'must_change_password': self.user.must_change_password,
        }

        return data
