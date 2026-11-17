from datetime import timedelta
from django.test import TestCase, override_settings
from django.utils import timezone
from django.core import mail
from rest_framework.test import APIClient
from .models import CustomUser, UserInvitation, PasswordResetToken


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend', FRONTEND_URL='http://localhost:3001')
class AccountWorkflowTests(TestCase):
    def setUp(self):
        self.admin=CustomUser.objects.create_user('admin-qa@example.test','QaTest!2026',name='QA',is_staff=True)
        self.client=APIClient()

    def test_expired_invites_are_listed_and_filtered_correctly(self):
        expired=UserInvitation.objects.create(email='expired@example.test',created_by=self.admin,expires_at=timezone.now()-timedelta(hours=1))
        current=UserInvitation.objects.create(email='pending@example.test',created_by=self.admin)
        self.client.force_authenticate(self.admin)
        response=self.client.get('/api/v1/accounts/invitations/?status=expired')
        self.assertEqual(response.status_code,200)
        self.assertEqual([item['id'] for item in response.data],[expired.pk])
        self.assertEqual(response.data[0]['status'],'expired')
        pending=self.client.get('/api/v1/accounts/invitations/?status=pending')
        self.assertEqual([item['id'] for item in pending.data],[current.pk])

    def test_invite_registration_cannot_be_reused(self):
        invitation=UserInvitation.objects.create(email='invite-qa@example.test',created_by=self.admin)
        payload={'token':invitation.token,'name':'Aluno convidado','password':'ValidQa!2026','confirm_password':'ValidQa!2026'}
        response=self.client.post('/api/v1/accounts/register/complete/',payload,format='json')
        self.assertEqual(response.status_code,201,response.data)
        self.assertEqual(self.client.post('/api/v1/accounts/register/complete/',payload,format='json').status_code,400)
        self.assertEqual(CustomUser.objects.filter(email=invitation.email).count(),1)

    def test_reset_email_has_local_frontend_and_token_is_single_use(self):
        response=self.client.post('/api/v1/accounts/password-reset/',{'email':self.admin.email},format='json')
        self.assertEqual(response.status_code,200)
        reset=PasswordResetToken.objects.get(user=self.admin,used=False)
        self.assertIn('http://localhost:3001/redefinir-senha/', mail.outbox[0].alternatives[0].content)
        payload={'token':reset.token,'password':'NewQa!2026Value','confirm_password':'NewQa!2026Value'}
        self.assertEqual(self.client.post('/api/v1/accounts/password-reset/confirm/',payload,format='json').status_code,200)
        self.assertEqual(self.client.post('/api/v1/accounts/password-reset/confirm/',payload,format='json').status_code,400)

    def test_profile_and_login_include_staff_permissions(self):
        response=self.client.post('/api/v1/accounts/token/',{'email':self.admin.email,'password':'QaTest!2026'},format='json')
        self.assertTrue(response.data['user']['is_staff'])
        self.client.force_authenticate(self.admin)
        self.assertTrue(self.client.get('/api/v1/accounts/me/').data['is_staff'])
