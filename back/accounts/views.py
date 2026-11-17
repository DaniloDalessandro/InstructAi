import logging
import secrets
import string

from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from rest_framework import generics, status, serializers as s
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from drf_spectacular.utils import (
    extend_schema, extend_schema_view, OpenApiParameter, OpenApiResponse, inline_serializer,
)
from drf_spectacular.types import OpenApiTypes

from .models import CustomUser, UserInvitation, PasswordResetToken
from .serializers import (
    CustomTokenObtainPairSerializer,
    UserProfileSerializer,
    UserAdminSerializer,
    ChangePasswordSerializer,
    UserInvitationSerializer,
    CreateInvitationSerializer,
    CompleteRegistrationSerializer,
    ManualUserCreateSerializer,
)

_detail = inline_serializer("DetailMsg", {"detail": s.CharField()})

logger = logging.getLogger(__name__)


def _generate_temp_password(length=12):
    chars = string.ascii_letters + string.digits + '!@#$%'
    return ''.join(secrets.choice(chars) for _ in range(length))


def _send_invitation_email(invitation):
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
    link = f'{frontend_url}/cadastro/convite/{invitation.token}'
    subject = 'Você foi convidado para o InstructAI'
    html = render_to_string('accounts/email_invitation.html', {
        'link': link,
        'email': invitation.email,
        'expires_at': invitation.expires_at,
    })
    try:
        send_mail(subject, '', settings.DEFAULT_FROM_EMAIL, [invitation.email], html_message=html)
    except Exception as exc:
        logger.error('Falha ao enviar e-mail de convite para %s: %s', invitation.email, exc)


def _send_manual_registration_email(user, temp_password):
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
    subject = 'Seu acesso ao InstructAI foi criado'
    html = render_to_string('accounts/email_manual_registration.html', {
        'name': user.name,
        'email': user.email,
        'temp_password': temp_password,
        'login_url': f'{frontend_url}/login',
    })
    try:
        send_mail(subject, '', settings.DEFAULT_FROM_EMAIL, [user.email], html_message=html)
    except Exception as exc:
        logger.error('Falha ao enviar e-mail de cadastro manual para %s: %s', user.email, exc)


@extend_schema(tags=["Autenticação"], summary="Login — obtém par de tokens JWT")
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


@extend_schema_view(
    get=extend_schema(tags=["Autenticação"], summary="Retorna dados do usuário autenticado"),
    put=extend_schema(tags=["Autenticação"], summary="Atualiza perfil completo"),
    patch=extend_schema(tags=["Autenticação"], summary="Atualiza perfil parcialmente"),
)
class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self):
        return self.request.user


@extend_schema_view(
    post=extend_schema(
        tags=["Autenticação"],
        summary="Alterar senha",
        request=ChangePasswordSerializer,
        responses={200: _detail, 400: _detail},
    )
)
class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response({'detail': 'Senha alterada com sucesso.'}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema_view(
    get=extend_schema(
        tags=["Usuários"],
        summary="Lista usuários (admin)",
        parameters=[
            OpenApiParameter("search", OpenApiTypes.STR, description="Busca por nome, e-mail ou CPF"),
            OpenApiParameter("sector", OpenApiTypes.INT, description="Filtra por setor (pode repetir)"),
        ],
    )
)
class UserListView(generics.ListAPIView):
    serializer_class = UserAdminSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        qs = CustomUser.objects.select_related('sector').order_by('-date_joined')
        search = self.request.query_params.get('search')
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(name__icontains=search) |
                Q(email__icontains=search) |
                Q(cpf__icontains=search)
            )
        sectors = self.request.query_params.getlist('sector')
        sectors = [s for s in sectors if s]
        if sectors:
            qs = qs.filter(sector_id__in=sectors)
        return qs


@extend_schema_view(
    get=extend_schema(tags=["Usuários"], summary="Detalha usuário (admin)"),
    put=extend_schema(tags=["Usuários"], summary="Atualiza usuário completo (admin)"),
    patch=extend_schema(tags=["Usuários"], summary="Atualiza usuário parcialmente (admin)"),
    delete=extend_schema(tags=["Usuários"], summary="Remove usuário (admin)", responses={204: None, 400: _detail}),
)
class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UserAdminSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    queryset = CustomUser.objects.all()

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        if user == request.user:
            return Response({'detail': 'Não é possível remover seu próprio usuário.'}, status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)


@extend_schema_view(
    post=extend_schema(
        tags=["Usuários"],
        summary="Cria usuário manualmente com senha temporária (admin)",
        request=ManualUserCreateSerializer,
        responses={201: UserAdminSerializer, 400: _detail},
    )
)
class ManualUserCreateView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request):
        serializer = ManualUserCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        temp_password = _generate_temp_password()

        user = CustomUser.objects.create_user(
            email=data['email'],
            password=temp_password,
            name=data['name'],
            cpf=data.get('cpf', ''),
            phone=data.get('phone', ''),
            position=data.get('position', ''),
            sector=data.get('sector'),
            is_staff=data.get('is_staff', False),
            is_superuser=data.get('is_superuser', False),
            is_active=data.get('is_active', True),
            must_change_password=True,
            created_by=request.user,
        )

        _send_manual_registration_email(user, temp_password)
        logger.info('Usuário %s criado manualmente por %s', user.email, request.user.email)

        return Response(UserAdminSerializer(user, context={'request': request}).data, status=status.HTTP_201_CREATED)


@extend_schema_view(
    get=extend_schema(
        tags=["Convites"],
        summary="Lista convites (admin)",
        parameters=[
            OpenApiParameter(
                "status", OpenApiTypes.STR,
                enum=["pending", "used", "cancelled"],
                description="Filtra por status do convite",
            )
        ],
        responses={200: UserInvitationSerializer(many=True)},
    ),
    post=extend_schema(
        tags=["Convites"],
        summary="Cria e envia convite por e-mail (admin)",
        request=CreateInvitationSerializer,
        responses={201: UserInvitationSerializer, 400: _detail},
    ),
)
class InvitationListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        invitations = UserInvitation.objects.select_related('created_by').order_by('-created_at')
        status_filter = request.query_params.get('status')
        now = timezone.now()
        if status_filter == UserInvitation.STATUS_EXPIRED:
            from django.db.models import Q
            invitations = invitations.filter(
                Q(status=UserInvitation.STATUS_EXPIRED) |
                Q(status=UserInvitation.STATUS_PENDING, expires_at__lte=now)
            )
        elif status_filter == UserInvitation.STATUS_PENDING:
            invitations = invitations.filter(status=status_filter, expires_at__gt=now)
        elif status_filter:
            invitations = invitations.filter(status=status_filter)
        serializer = UserInvitationSerializer(invitations, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = CreateInvitationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        invitation = UserInvitation.objects.create(
            email=serializer.validated_data['email'],
            created_by=request.user,
        )
        _send_invitation_email(invitation)
        logger.info('Convite enviado para %s por %s', invitation.email, request.user.email)

        return Response(UserInvitationSerializer(invitation).data, status=status.HTTP_201_CREATED)


@extend_schema_view(
    post=extend_schema(
        tags=["Convites"],
        operation_id="invitation_resend",
        summary="Reenviar convite (admin)",
        request=None,
        responses={200: UserInvitationSerializer, 400: _detail, 404: _detail},
    ),
    delete=extend_schema(
        tags=["Convites"],
        summary="Cancelar convite (admin)",
        responses={204: None, 404: _detail},
    ),
)
class InvitationDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_object(self, pk):
        try:
            return UserInvitation.objects.get(pk=pk)
        except UserInvitation.DoesNotExist:
            return None

    def delete(self, request, pk):
        invitation = self.get_object(pk)
        if not invitation:
            return Response(status=status.HTTP_404_NOT_FOUND)
        invitation.status = UserInvitation.STATUS_CANCELLED
        invitation.save(update_fields=['status'])
        return Response(status=status.HTTP_204_NO_CONTENT)

    def post(self, request, pk):
        invitation = self.get_object(pk)
        if not invitation:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if invitation.status == UserInvitation.STATUS_USED:
            return Response({'detail': 'Este convite já foi utilizado.'}, status=status.HTTP_400_BAD_REQUEST)

        invitation.refresh_token()
        invitation.save()
        _send_invitation_email(invitation)
        logger.info('Convite reenviado para %s por %s', invitation.email, request.user.email)

        return Response(UserInvitationSerializer(invitation).data)


@extend_schema_view(
    get=extend_schema(
        tags=["Cadastro"],
        summary="Valida token de convite e retorna o e-mail (público)",
        auth=[],
        responses={
            200: inline_serializer("InviteTokenInfo", {
                "email": s.EmailField(),
                "expires_at": s.DateTimeField(),
            }),
            404: _detail,
        },
    )
)
class ValidateInvitationTokenView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        invitation = UserInvitation.objects.filter(token=token).first()
        if not invitation or not invitation.is_valid:
            return Response({'detail': 'Convite inválido ou expirado.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'email': invitation.email, 'expires_at': invitation.expires_at})


@extend_schema_view(
    post=extend_schema(
        tags=["Cadastro"],
        summary="Completa cadastro via token de convite (público)",
        auth=[],
        request=CompleteRegistrationSerializer,
        responses={201: _detail, 400: _detail},
    )
)
class CompleteRegistrationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = CompleteRegistrationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        invitation = data['invitation']

        user = CustomUser.objects.create_user(
            email=invitation.email,
            password=data['password'],
            name=data['name'],
            cpf=data.get('cpf', ''),
            phone=data.get('phone', ''),
            position=data.get('position', ''),
            sector=data.get('sector'),
            must_change_password=False,
        )

        invitation.status = UserInvitation.STATUS_USED
        invitation.used_at = timezone.now()
        invitation.invited_user = user
        invitation.save(update_fields=['status', 'used_at', 'invited_user'])

        logger.info('Cadastro completado via convite: %s', user.email)
        return Response({'detail': 'Cadastro realizado com sucesso.'}, status=status.HTTP_201_CREATED)


_reset_request_body = inline_serializer("PasswordResetRequest", {"email": s.EmailField()})
_reset_confirm_body = inline_serializer("PasswordResetConfirm", {
    "token": s.CharField(),
    "password": s.CharField(min_length=8),
    "confirm_password": s.CharField(min_length=8),
})

def _send_password_reset_email(user, token_obj):
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
    link = f'{frontend_url}/redefinir-senha/{token_obj.token}'
    subject = 'Redefinição de senha — InstructAI'
    html = render_to_string('accounts/email_password_reset.html', {
        'email': user.email,
        'link': link,
    })
    try:
        send_mail(subject, '', settings.DEFAULT_FROM_EMAIL, [user.email], html_message=html)
    except Exception as exc:
        logger.error('Falha ao enviar e-mail de reset de senha para %s: %s', user.email, exc)


@extend_schema_view(
    post=extend_schema(
        tags=["Recuperação de Senha"],
        summary="Solicita link de redefinição de senha (público)",
        description="Sempre retorna 200 para evitar enumeração de usuários.",
        auth=[],
        request=_reset_request_body,
        responses={200: _detail},
    )
)
class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({'detail': 'E-mail obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)

        user = CustomUser.objects.filter(email=email, is_active=True).first()
        if user:
            # Invalida tokens anteriores
            PasswordResetToken.objects.filter(user=user, used=False).update(used=True)
            token_obj = PasswordResetToken.objects.create(user=user)
            _send_password_reset_email(user, token_obj)
            logger.info('Link de reset de senha enviado para %s', email)

        return Response({'detail': 'Se este e-mail estiver cadastrado, você receberá as instruções em breve.'})


@extend_schema_view(
    get=extend_schema(
        tags=["Recuperação de Senha"],
        summary="Valida token de reset e retorna o e-mail (público)",
        auth=[],
        responses={
            200: inline_serializer("ResetTokenInfo", {"email": s.EmailField()}),
            404: _detail,
        },
    )
)
class PasswordResetValidateView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        token_obj = PasswordResetToken.objects.select_related('user').filter(token=token).first()
        if not token_obj or not token_obj.is_valid:
            return Response({'detail': 'Link inválido ou expirado.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'email': token_obj.user.email})


@extend_schema_view(
    post=extend_schema(
        tags=["Recuperação de Senha"],
        summary="Redefine a senha usando o token (público)",
        auth=[],
        request=_reset_confirm_body,
        responses={200: _detail, 400: _detail},
    )
)
class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get('token', '').strip()
        password = request.data.get('password', '')
        confirm = request.data.get('confirm_password', '')

        if not token or not password:
            return Response({'detail': 'Token e nova senha são obrigatórios.'}, status=status.HTTP_400_BAD_REQUEST)

        if password != confirm:
            return Response({'detail': 'As senhas não coincidem.'}, status=status.HTTP_400_BAD_REQUEST)

        if len(password) < 8:
            return Response({'detail': 'A senha deve ter no mínimo 8 caracteres.'}, status=status.HTTP_400_BAD_REQUEST)

        token_obj = PasswordResetToken.objects.select_related('user').filter(token=token).first()
        if not token_obj or not token_obj.is_valid:
            return Response({'detail': 'Link inválido ou expirado.'}, status=status.HTTP_400_BAD_REQUEST)

        user = token_obj.user
        user.set_password(password)
        user.must_change_password = False
        user.save(update_fields=['password', 'must_change_password'])

        token_obj.used = True
        token_obj.save(update_fields=['used'])

        logger.info('Senha redefinida com sucesso para %s', user.email)
        return Response({'detail': 'Senha redefinida com sucesso.'})
