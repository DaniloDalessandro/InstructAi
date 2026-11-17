import tempfile
from django.test import TestCase, override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from accounts.models import CustomUser
from sectors.models import Sector
from .models import Manual


@override_settings(OPENAI_API_KEY='')
class ManualUploadTests(TestCase):
    def test_multipart_creation_keeps_public_default_and_visibility_updates(self):
        with tempfile.TemporaryDirectory() as directory, override_settings(MEDIA_ROOT=directory):
            user=CustomUser.objects.create_user('upload-qa@example.test','QaTest!2026',name='QA',is_staff=True)
            sector=Sector.objects.create(name='Setor QA')
            client=APIClient();client.force_authenticate(user)
            response=client.post('/api/v1/manuals/',{'name':'Manual QA','sectors':[sector.pk],'pdf_file':SimpleUploadedFile('qa.pdf',b'%PDF-1.4 test',content_type='application/pdf')},format='multipart')
            self.assertEqual(response.status_code,201,response.data)
            manual=Manual.objects.get(pk=response.data['id'])
            self.assertTrue(manual.available_for_all_sectors)
            updated=client.patch(f'/api/v1/manuals/{manual.pk}/',{'name':'Manual QA editado','sectors':[sector.pk],'available_for_all_sectors':'false','allowed_sectors':[sector.pk],'available_from':'2030-01-01T00:00:00Z','available_until':'2030-02-01T00:00:00Z'},format='multipart')
            self.assertEqual(updated.status_code,200,updated.data)
            manual.refresh_from_db()
            self.assertFalse(manual.available_for_all_sectors)
            self.assertEqual(list(manual.allowed_sectors.values_list('pk',flat=True)),[sector.pk])
            self.assertEqual(manual.available_from.year,2030)
