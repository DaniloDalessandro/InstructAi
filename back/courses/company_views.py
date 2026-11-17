import re
import uuid
from django.db import transaction
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import IssuingCompany, Certificate


class IssuingCompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = IssuingCompany
        fields = ['id', 'name', 'cnpj', 'signatory_name', 'signatory_role', 'certificate_text',
                  'criado_em', 'criado_por', 'atualizado_em', 'atualizado_por']
        read_only_fields = ['id', 'criado_em', 'criado_por', 'atualizado_em', 'atualizado_por']

    def validate_cnpj(self, value):
        if value and len(re.sub(r'\D', '', value)) != 14:
            raise serializers.ValidationError('Informe um CNPJ com 14 dígitos ou deixe em branco.')
        return value


class IssuingCompanyView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        company = IssuingCompany.objects.filter(pk=1).first()
        return Response(IssuingCompanySerializer(company).data if company else {'configured': False})

    @transaction.atomic
    def put(self, request):
        company = IssuingCompany.objects.select_for_update().filter(pk=1).first()
        serializer = IssuingCompanySerializer(company, data=request.data)
        serializer.is_valid(raise_exception=True)
        audit = {'atualizado_por': request.user}
        if not company:
            audit['criado_por'] = request.user
        serializer.save(pk=1, **audit)
        return Response(serializer.data)


class CertificateValidationView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, code):
        try:
            validation_code = uuid.UUID(code)
        except (ValueError, AttributeError):
            return Response({'detail': 'Código de certificado inválido.'}, status=status.HTTP_400_BAD_REQUEST)
        certificate = Certificate.objects.select_related('user', 'course').filter(validation_code=validation_code).first()
        if certificate is None:
            return Response({'detail': 'Certificado não encontrado. Confira o código informado.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({
            'valid': True, 'validation_code': str(certificate.validation_code),
            'student_name': certificate.user.name or certificate.user.email.split('@')[0],
            'course_name': certificate.course.name, 'workload_hours': certificate.course.workload_hours,
            'issued_at': certificate.issued_at, 'company_name': certificate.issuer_snapshot.get('name', ''),
            'company_cnpj': certificate.issuer_snapshot.get('cnpj', ''),
        })
