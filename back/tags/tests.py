from django.test import TestCase
from rest_framework.test import APIClient
from accounts.models import CustomUser
from .models import Tag


class CatalogStatusTests(TestCase):
    def test_admin_can_find_and_reactivate_an_inactive_tag(self):
        admin=CustomUser.objects.create_user('tag-admin@example.test','QaTest!2026',name='QA',is_staff=True)
        tag=Tag.objects.create(name='QA',is_active=False)
        client=APIClient();client.force_authenticate(admin)
        response=client.patch(f'/api/v1/tags/{tag.pk}/',{'is_active':True},format='json')
        self.assertEqual(response.status_code,200,response.data)
        tag.refresh_from_db();self.assertTrue(tag.is_active)

    def test_regular_user_can_filter_catalogs_but_cannot_modify_them(self):
        reader=CustomUser.objects.create_user('tag-reader@example.test','QaTest!2026',name='QA')
        client=APIClient();client.force_authenticate(reader)
        self.assertEqual(client.get('/api/v1/tags/').status_code,200)
        self.assertEqual(client.post('/api/v1/tags/',{'name':'Indevido'},format='json').status_code,403)
        self.assertEqual(client.post('/api/v1/sectors/',{'name':'Indevido'},format='json').status_code,403)
