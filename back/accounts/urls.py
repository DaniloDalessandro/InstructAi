from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    CustomTokenObtainPairView,
    MeView,
    ChangePasswordView,
    UserListView,
    UserDetailView,
    ManualUserCreateView,
    InvitationListCreateView,
    InvitationDetailView,
    ValidateInvitationTokenView,
    CompleteRegistrationView,
    PasswordResetRequestView,
    PasswordResetValidateView,
    PasswordResetConfirmView,
)

urlpatterns = [
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', MeView.as_view(), name='me'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),

    # User management (admin only)
    path('users/', UserListView.as_view(), name='user_list'),
    path('users/create/', ManualUserCreateView.as_view(), name='user_create'),
    path('users/<int:pk>/', UserDetailView.as_view(), name='user_detail'),

    # Invitations (admin only)
    path('invitations/', InvitationListCreateView.as_view(), name='invitation_list_create'),
    path('invitations/<int:pk>/', InvitationDetailView.as_view(), name='invitation_detail'),

    # Public endpoints
    path('invitations/validate/<str:token>/', ValidateInvitationTokenView.as_view(), name='invitation_validate'),
    path('register/complete/', CompleteRegistrationView.as_view(), name='register_complete'),

    # Password reset (public)
    path('password-reset/', PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('password-reset/validate/<str:token>/', PasswordResetValidateView.as_view(), name='password_reset_validate'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
]
