import tempfile
import uuid
import pymupdf as fitz
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from accounts.models import CustomUser
from sectors.models import Sector
from .models import IssuingCompany, Course, Lesson, Question, CourseProgress, Certificate
from .certificate_generator import generate_certificate_pdf


@override_settings(FRONTEND_URL='http://localhost:3001', OPENAI_API_KEY='')
class CertificateWorkflowTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.media = tempfile.TemporaryDirectory()
        cls.media_override = override_settings(MEDIA_ROOT=cls.media.name)
        cls.media_override.enable()

    @classmethod
    def tearDownClass(cls):
        cls.media_override.disable()
        cls.media.cleanup()
        super().tearDownClass()

    def setUp(self):
        self.admin = CustomUser.objects.create_user('admin-qa@example.test', 'Test123!abc', name='Administrador', is_staff=True)
        self.student = CustomUser.objects.create_user('student-qa@example.test', 'Test123!abc', name='Aluno QA', cpf='000.000.000-00')
        self.sector = Sector.objects.create(name='QA')
        self.course = Course.objects.create(name='Curso QA', sector=self.sector, workload_hours=4, description='Teste', owner=self.admin)
        self.client = APIClient()

    def company(self, **kwargs):
        return IssuingCompany.objects.create(name='Empresa QA', signatory_name='Responsável QA', signatory_role='Coordenação', **kwargs)

    def issue(self):
        CourseProgress.objects.create(user=self.student, course=self.course, completion_percentage=100)
        return Certificate.objects.get(user=self.student, course=self.course)

    def test_company_cannot_be_modified_by_student(self):
        self.client.force_authenticate(self.student)
        self.assertEqual(self.client.put('/api/v1/issuing-company/', {'name':'Não permitido'}, format='json').status_code, 403)
        self.assertEqual(IssuingCompany.objects.count(), 0)

    def test_company_registration_is_single_and_audited(self):
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.get('/api/v1/issuing-company/').data, {'configured':False})
        first = self.client.put('/api/v1/issuing-company/', {'name':'Empresa A'}, format='json')
        self.assertEqual(first.status_code, 200, first.data)
        second = self.client.put('/api/v1/issuing-company/', {'name':'Empresa B'}, format='json')
        self.assertEqual(second.status_code, 200)
        company = IssuingCompany.objects.get()
        self.assertEqual(company.name, 'Empresa B')
        self.assertEqual(company.criado_por, self.admin)
        self.assertEqual(company.atualizado_por, self.admin)
        self.assertIsNotNone(company.criado_em)
        self.assertIsNotNone(company.atualizado_em)

    def test_company_requires_name_and_rejects_incomplete_cnpj(self):
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.put('/api/v1/issuing-company/', {}, format='json').status_code, 400)
        self.assertEqual(self.client.put('/api/v1/issuing-company/', {'name':'QA','cnpj':'123'}, format='json').status_code, 400)

    def test_no_certificate_issued_before_company_registration(self):
        progress = CourseProgress.objects.create(user=self.student, course=self.course, completion_percentage=100)
        self.assertFalse(Certificate.objects.exists())
        self.client.force_authenticate(self.student)
        response = self.client.post('/api/v1/certificates/generate/', {'course_id':self.course.pk}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('empresa', response.data['error'])

    def test_public_validation_returns_only_verification_fields(self):
        self.company()
        certificate = self.issue()
        response = self.client.get(f'/api/v1/certificates/validate/{certificate.validation_code}/')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['valid'])
        self.assertEqual(response.data['student_name'], self.student.name)
        self.assertEqual(response.data['company_name'], 'Empresa QA')
        self.assertNotIn(self.student.email, str(response.data))
        self.assertNotIn(self.student.cpf, str(response.data))
        self.assertNotIn('pdf_url', response.data)

    def test_validation_unknown_and_malformed_codes(self):
        self.assertEqual(self.client.get('/api/v1/certificates/validate/not-a-uuid/').status_code, 400)
        self.assertEqual(self.client.get(f'/api/v1/certificates/validate/{uuid.uuid4()}/').status_code, 404)

    def test_pdf_has_company_signature_and_public_link_on_one_page(self):
        self.company(certificate_text='Texto institucional de teste.')
        certificate = self.issue()
        pdf = fitz.open(stream=generate_certificate_pdf(certificate).read(), filetype='pdf')
        self.assertEqual(pdf.page_count, 1)
        text = pdf[0].get_text()
        for expected in ['Empresa QA', 'Responsável QA', 'Coordenação', 'Texto institucional de teste.', str(certificate.validation_code)]:
            self.assertIn(expected, text)
        self.assertTrue(any(link.get('uri') == f'http://localhost:3001/validar-certificado?codigo={certificate.validation_code}' for link in pdf[0].get_links()))

    def test_existing_issuer_is_preserved_after_company_changes(self):
        company = self.company()
        certificate = self.issue()
        company.name = 'Nova Empresa'
        company.save()
        certificate.save()
        certificate.refresh_from_db()
        self.assertEqual(certificate.issuer_snapshot['name'], 'Empresa QA')
        pdf = fitz.open(stream=generate_certificate_pdf(certificate).read(), filetype='pdf')
        self.assertIn('Empresa QA', pdf[0].get_text())
        self.assertNotIn('Nova Empresa', pdf[0].get_text())

    def test_long_certificate_content_stays_on_one_page(self):
        self.company(certificate_text=('Treinamento e desenvolvimento de pessoas. '*12)[:500])
        self.student.name = 'Nome muito longo do participante de treinamento ' * 4
        self.student.save()
        self.course.name = 'Formação e desenvolvimento de profissionais ' * 4
        self.course.save()
        certificate = self.issue()
        pdf = fitz.open(stream=generate_certificate_pdf(certificate).read(), filetype='pdf')
        self.assertEqual(pdf.page_count,1)
        self.assertIn('Empresa QA',pdf[0].get_text())

    def test_exam_with_two_options_and_unanswered_timeout(self):
        self.course.has_final_exam = True
        self.course.save()
        question = Question.objects.create(course=self.course,text='Objetivo?',options=['Validar','Outra'],correct_option=0)
        self.client.force_authenticate(self.student)
        wrong = self.client.post(f'/api/v1/courses/{self.course.pk}/submit_exam/', {'answers':{}}, format='json')
        self.assertEqual(wrong.status_code,200,wrong.data)
        self.assertEqual(wrong.data['score'],0)
        self.assertIsNone(wrong.data['question_results'][str(question.pk)]['your_answer'])
        invalid = self.client.post(f'/api/v1/courses/{self.course.pk}/submit_exam/', {'answers':{str(question.pk):'invalid'}}, format='json')
        self.assertEqual(invalid.status_code,400)
        valid = self.client.post(f'/api/v1/courses/{self.course.pk}/submit_exam/', {'answers':{str(question.pk):0}}, format='json')
        self.assertEqual(valid.status_code,200)
        self.assertEqual(valid.data['score'],100)

    def test_page_size_is_honored(self):
        Sector.objects.bulk_create([Sector(name=f'Setor {i}') for i in range(15)])
        self.client.force_authenticate(self.admin)
        response=self.client.get('/api/v1/sectors/?page_size=100')
        self.assertEqual(response.status_code,200)
        self.assertEqual(len(response.data['results']),16)

    def test_student_can_complete_a_visible_lesson_but_not_edit_it(self):
        lesson=Lesson.objects.create(course=self.course,name='Aula QA',youtube_url='https://www.youtube.com/watch?v=aqz-KE-bpKQ')
        self.client.force_authenticate(self.student)
        self.assertEqual(self.client.patch(f'/api/v1/lessons/{lesson.pk}/',{'name':'Indevido'},format='json').status_code,403)
        self.assertEqual(self.client.post(f'/api/v1/lessons/{lesson.pk}/complete/').status_code,200)
        self.assertEqual(CourseProgress.objects.get(course=self.course,user=self.student).completion_percentage,100)

    def test_private_course_lessons_are_not_exposed_to_unrelated_student(self):
        self.course.available_for_all_sectors=False
        self.course.save()
        lesson=Lesson.objects.create(course=self.course,name='Restrita',youtube_url='https://www.youtube.com/watch?v=aqz-KE-bpKQ')
        self.client.force_authenticate(self.student)
        self.assertEqual(self.client.get(f'/api/v1/lessons/{lesson.pk}/').status_code,404)
        self.assertEqual(self.client.post(f'/api/v1/lessons/{lesson.pk}/complete/').status_code,404)

    def test_student_cannot_read_correct_answer_from_course_or_question(self):
        question=Question.objects.create(course=self.course,text='QA?',options=['A','B'],correct_option=0)
        self.client.force_authenticate(self.student)
        response=self.client.get(f'/api/v1/courses/{self.course.pk}/')
        self.assertNotIn('correct_option',response.data['questions'][0])
        self.assertNotIn('correct_option',self.client.get(f'/api/v1/questions/{question.pk}/').data)

    def test_participant_search_does_not_filter_the_parent_course(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get(f'/api/v1/courses/{self.course.pk}/participants/', {'search': self.student.email, 'page_size': 100})
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['email'], self.student.email)
        self.client.force_authenticate(self.student)
        response = self.client.get(f'/api/v1/courses/{self.course.pk}/participants/', {'search': self.student.email})
        self.assertEqual(response.status_code, 403)