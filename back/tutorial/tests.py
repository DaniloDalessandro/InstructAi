from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from accounts.models import CustomUser
from sectors.models import Sector
from .models import Tutorial


@override_settings(OPENAI_API_KEY='')
class TutorialFilterTests(TestCase):
    def test_multiple_sectors_filter_keeps_tutorials_from_each_sector(self):
        user=CustomUser.objects.create_user('filter-qa@example.test','QaTest!2026',name='QA')
        sectors=[Sector.objects.create(name=f'QA {i}') for i in range(3)]
        tutorials=[Tutorial.objects.create(title=f'QA {i}',description='Descrição QA',sector=sector,created_by=user) for i,sector in enumerate(sectors)]
        client=APIClient();client.force_authenticate(user)
        response=client.get(f'/api/v1/tutorials/tutorials/?sector={sectors[0].pk},{sectors[1].pk}')
        self.assertEqual(response.status_code,200,response.data)
        self.assertEqual({item['id'] for item in response.data['results']},{str(tutorials[0].pk),str(tutorials[1].pk)})
