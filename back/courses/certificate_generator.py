from io import BytesIO
from django.conf import settings
from django.core.files.base import ContentFile
from django.utils.timezone import localtime
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import simpleSplit
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics import renderPDF


def generate_certificate_pdf(certificate):
    """Certificado em uma página, com emissora, assinatura e validação pública."""
    buffer = BytesIO()
    width, height = landscape(A4)
    pdf = canvas.Canvas(buffer, pagesize=(width, height))
    pdf.setTitle(f'Certificado - {certificate.course.name}')
    issuer = certificate.issuer_snapshot or {}
    company_name = issuer.get('name', '')
    pdf.setAuthor(company_name or 'InstructAI')
    pdf.setFillColor(HexColor('#fafaff'))
    pdf.rect(0, 0, width, height, fill=1, stroke=0)
    pdf.setStrokeColor(HexColor('#5e6ad2'))
    pdf.setLineWidth(2)
    pdf.rect(28, 28, width-56, height-56)
    pdf.setLineWidth(.5)
    pdf.rect(35, 35, width-70, height-70)

    def centered(text, y, size=12, font='Helvetica', max_lines=2, max_width=690, color='#252947'):
        size = float(size)
        lines = simpleSplit(str(text), font, size, max_width)
        while len(lines) > max_lines and size > 6:
            size -= .5
            lines = simpleSplit(str(text), font, size, max_width)
        pdf.setFillColor(HexColor(color))
        pdf.setFont(font, size)
        for line in lines:
            pdf.drawCentredString(width/2, y, line)
            y -= size*1.3
        return y

    centered('InstructAI', 535, 14, 'Helvetica-Bold', color='#5e6ad2')
    centered('CERTIFICADO DE CONCLUSÃO', 487, 27, 'Helvetica-Bold')
    pdf.setStrokeColor(HexColor('#d4af37'))
    pdf.line(width/2-100, 472, width/2+100, 472)
    centered(f'{company_name} certifica que' if company_name else 'Certificamos que', 445, 11, max_lines=2)
    centered(certificate.user.name or certificate.user.email.split('@')[0], 403, 25, 'Helvetica-Bold', color='#4338ca')
    centered('concluiu com êxito o curso', 360, 11)
    centered(certificate.course.name, 330, 19, 'Helvetica-Bold')
    centered(f'Carga horária: {certificate.course.workload_hours} horas', 286, 11)
    if issuer.get('certificate_text'):
        centered(issuer['certificate_text'], 258, 10, max_lines=4)

    if company_name:
        if issuer.get('signatory_name'):
            centered(issuer['signatory_name'], 179, 12, 'Helvetica-Oblique', max_lines=1, max_width=340)
        pdf.setStrokeColor(HexColor('#8187a3'))
        pdf.line(width/2-155, 164, width/2+155, 164)
        centered(company_name, 148, 11, 'Helvetica-Bold', max_width=360)
        if issuer.get('signatory_role'):
            centered(issuer['signatory_role'], 117, 9, max_lines=1, max_width=340)
        else:
            centered('Empresa emissora', 117, 9)
        if issuer.get('cnpj'):
            centered(f"CNPJ: {issuer['cnpj']}", 103, 8, max_lines=1)

    code = str(certificate.validation_code)
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3001').rstrip('/')
    validation_url = f'{frontend_url}/validar-certificado?codigo={code}'
    pdf.setFillColor(HexColor('#62687c'))
    pdf.setFont('Helvetica', 9)
    issued = localtime(certificate.issued_at).strftime('%d/%m/%Y')
    pdf.drawString(53, 94, f'Emitido em {issued}')
    pdf.setFont('Helvetica', 8)
    pdf.drawString(53, 78, f'Código de validação: {code}')
    pdf.setFont('Helvetica', 7)
    pdf.drawString(53, 61, 'Confira a autenticidade pelo QR Code ou pelo endereço:')
    pdf.drawString(53, 49, f'{frontend_url}/validar-certificado')
    pdf.linkURL(validation_url, (50, 45, 440, 87), relative=0)
    qr = QrCodeWidget(validation_url)
    x1,y1,x2,y2 = qr.getBounds()
    size = 74
    drawing = Drawing(size, size, transform=[size/(x2-x1),0,0,size/(y2-y1),0,0])
    drawing.add(qr)
    renderPDF.draw(drawing, pdf, width-134, 49)
    pdf.showPage()
    pdf.save()
    return ContentFile(buffer.getvalue(), name=f'certificado_{certificate.validation_code}.pdf')
