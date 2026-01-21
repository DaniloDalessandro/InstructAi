from django.core.management.base import BaseCommand
from courses.models import Certificate
from courses.certificate_generator import generate_certificate_pdf


class Command(BaseCommand):
    help = 'Gera PDFs para certificados que ainda nao possuem arquivo PDF'

    def handle(self, *args, **options):
        # Buscar certificados sem PDF
        certificates_without_pdf = Certificate.objects.filter(pdf_file='')

        total = certificates_without_pdf.count()
        self.stdout.write(f'Encontrados {total} certificados sem PDF')

        success_count = 0
        error_count = 0

        for certificate in certificates_without_pdf:
            try:
                self.stdout.write(f'Gerando PDF para certificado {certificate.id}...')

                # Gerar PDF
                pdf_content = generate_certificate_pdf(certificate)

                # Salvar PDF no modelo
                certificate.pdf_file.save(pdf_content.name, pdf_content, save=True)

                self.stdout.write(self.style.SUCCESS(
                    f'[OK] PDF gerado: {certificate.pdf_file.name}'
                ))
                success_count += 1

            except Exception as e:
                self.stdout.write(self.style.ERROR(
                    f'[ERRO] Falha ao gerar PDF para certificado {certificate.id}: {str(e)}'
                ))
                error_count += 1
                import traceback
                traceback.print_exc()

        self.stdout.write(self.style.SUCCESS(
            f'\nProcessamento concluido: {success_count} sucessos, {error_count} erros'
        ))
