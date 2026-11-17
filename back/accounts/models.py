import secrets
from datetime import timedelta

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.conf import settings
from django.db import models
from django.utils import timezone


class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('O email deve ser fornecido')

        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser deve ter is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser deve ter is_superuser=True.')

        return self.create_user(email, password, **extra_fields)


class CustomUser(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True, verbose_name='Email')
    name = models.CharField(max_length=255, verbose_name='Nome')
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(default=timezone.now)
    phone = models.CharField(max_length=20, blank=True, default='')
    position = models.CharField(max_length=255, blank=True, default='', verbose_name='Cargo')
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    cpf = models.CharField(max_length=14, blank=True, default='', verbose_name='CPF')
    sector = models.ForeignKey(
        'sectors.Sector',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='users',
        verbose_name='Setor',
    )
    must_change_password = models.BooleanField(default=False, verbose_name='Deve trocar senha')
    created_by = models.ForeignKey(
        'self',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='created_users',
        verbose_name='Criado por',
    )

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name']

    class Meta:
        verbose_name = 'Usuário'
        verbose_name_plural = 'Usuários'

    def __str__(self):
        return self.email


class UserInvitation(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_USED = 'used'
    STATUS_EXPIRED = 'expired'
    STATUS_CANCELLED = 'cancelled'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pendente'),
        (STATUS_USED, 'Usado'),
        (STATUS_EXPIRED, 'Expirado'),
        (STATUS_CANCELLED, 'Cancelado'),
    ]

    email = models.EmailField(verbose_name='Email')
    token = models.CharField(max_length=64, unique=True, editable=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='invitations_created',
        verbose_name='Criado por',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    invited_user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='invitation',
        verbose_name='Usuário convidado',
    )

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = secrets.token_urlsafe(32)
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=8)
        super().save(*args, **kwargs)

    @property
    def is_valid(self):
        return self.status == self.STATUS_PENDING and timezone.now() < self.expires_at

    def refresh_token(self):
        self.token = secrets.token_urlsafe(32)
        self.expires_at = timezone.now() + timedelta(hours=8)
        self.status = self.STATUS_PENDING

    class Meta:
        verbose_name = 'Convite'
        verbose_name_plural = 'Convites'
        ordering = ['-created_at']

    def __str__(self):
        return f'Convite para {self.email} ({self.get_status_display()})'


class PasswordResetToken(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='password_reset_tokens',
        verbose_name='Usuário',
    )
    token = models.CharField(max_length=64, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = secrets.token_urlsafe(32)
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=1)
        super().save(*args, **kwargs)

    @property
    def is_valid(self):
        return not self.used and timezone.now() < self.expires_at

    class Meta:
        verbose_name = 'Token de recuperação de senha'
        verbose_name_plural = 'Tokens de recuperação de senha'
        ordering = ['-created_at']

    def __str__(self):
        return f'Reset de senha para {self.user.email}'
