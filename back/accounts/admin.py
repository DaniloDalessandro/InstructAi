from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, UserInvitation


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = ['email', 'name', 'sector', 'is_staff', 'is_active', 'must_change_password', 'date_joined']
    list_filter = ['is_staff', 'is_active', 'must_change_password', 'sector']
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Informações Pessoais', {'fields': ('name', 'cpf', 'phone', 'position', 'sector', 'avatar')}),
        ('Permissões', {'fields': ('is_staff', 'is_active', 'is_superuser', 'must_change_password', 'groups', 'user_permissions')}),
        ('Datas Importantes', {'fields': ('last_login', 'date_joined')}),
        ('Auditoria', {'fields': ('created_by',)}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'name', 'password1', 'password2', 'is_staff', 'is_active')}
        ),
    )
    search_fields = ('email', 'name', 'cpf')
    ordering = ('email',)
    readonly_fields = ('date_joined', 'created_by')


def _resend_invitation(modeladmin, request, queryset):
    from .views import _send_invitation_email
    count = 0
    for invitation in queryset:
        if invitation.status == UserInvitation.STATUS_USED:
            modeladmin.message_user(request, f'Convite para {invitation.email} já foi utilizado.', messages.WARNING)
            continue
        invitation.refresh_token()
        invitation.save()
        _send_invitation_email(invitation)
        count += 1
    if count:
        modeladmin.message_user(request, f'{count} convite(s) reenviado(s) com sucesso.', messages.SUCCESS)


_resend_invitation.short_description = 'Reenviar convite(s) selecionado(s)'


def _cancel_invitation(modeladmin, request, queryset):
    updated = queryset.exclude(status=UserInvitation.STATUS_USED).update(status=UserInvitation.STATUS_CANCELLED)
    modeladmin.message_user(request, f'{updated} convite(s) cancelado(s).', messages.SUCCESS)


_cancel_invitation.short_description = 'Cancelar convite(s) selecionado(s)'


@admin.register(UserInvitation)
class UserInvitationAdmin(admin.ModelAdmin):
    list_display = ['email', 'status', 'created_by', 'created_at', 'expires_at', 'used_at']
    list_filter = ['status', 'created_at']
    search_fields = ['email']
    readonly_fields = ['token', 'created_at', 'used_at', 'invited_user']
    ordering = ['-created_at']
    actions = [_resend_invitation, _cancel_invitation]

    def has_change_permission(self, request, obj=None):
        return request.user.is_superuser

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
        if not change:
            from .views import _send_invitation_email
            _send_invitation_email(obj)
