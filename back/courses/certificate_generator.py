import os
from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.enums import TA_CENTER
from django.core.files.base import ContentFile


def generate_certificate_pdf(certificate):
    """
    Gera um certificado em PDF com design profissional.

    Args:
        certificate: Instância do modelo Certificate

    Returns:
        ContentFile com o PDF gerado
    """
    buffer = BytesIO()

    # Configurar documento em paisagem (landscape)
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm
    )

    # Estilos
    styles = getSampleStyleSheet()

    # Estilo para título principal
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=36,
        textColor=colors.HexColor('#1a365d'),
        spaceAfter=30,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )

    # Estilo para subtítulo
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontSize=16,
        textColor=colors.HexColor('#4a5568'),
        spaceAfter=20,
        alignment=TA_CENTER,
        fontName='Helvetica'
    )

    # Estilo para nome do usuário
    user_name_style = ParagraphStyle(
        'UserName',
        parent=styles['Heading2'],
        fontSize=28,
        textColor=colors.HexColor('#2d3748'),
        spaceAfter=20,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )

    # Estilo para nome do curso
    course_name_style = ParagraphStyle(
        'CourseName',
        parent=styles['Normal'],
        fontSize=20,
        textColor=colors.HexColor('#1a365d'),
        spaceAfter=30,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )

    # Estilo para informações
    info_style = ParagraphStyle(
        'Info',
        parent=styles['Normal'],
        fontSize=12,
        textColor=colors.HexColor('#718096'),
        alignment=TA_CENTER,
        fontName='Helvetica'
    )

    # Elementos do certificado
    elements = []

    # Espaço superior
    elements.append(Spacer(1, 1.5*cm))

    # Título
    elements.append(Paragraph('CERTIFICADO DE CONCLUSÃO', title_style))

    # Subtítulo
    elements.append(Paragraph('Certificamos que', subtitle_style))

    # Nome do usuário
    user_name = certificate.user.name or certificate.user.email
    elements.append(Paragraph(user_name.upper(), user_name_style))

    # Texto
    elements.append(Paragraph('concluiu com êxito o curso', subtitle_style))

    # Nome do curso
    elements.append(Paragraph(f'<b>{certificate.course.name}</b>', course_name_style))

    # Carga horária
    elements.append(Spacer(1, 0.5*cm))
    elements.append(Paragraph(
        f'Com carga horária de <b>{certificate.course.workload_hours} horas</b>',
        info_style
    ))

    # Data de emissão
    elements.append(Spacer(1, 1*cm))
    issue_date = certificate.issued_at.strftime('%d de %B de %Y')
    # Converter mês para português
    meses = {
        'January': 'janeiro', 'February': 'fevereiro', 'March': 'março',
        'April': 'abril', 'May': 'maio', 'June': 'junho',
        'July': 'julho', 'August': 'agosto', 'September': 'setembro',
        'October': 'outubro', 'November': 'novembro', 'December': 'dezembro'
    }
    for eng, pt in meses.items():
        issue_date = issue_date.replace(eng, pt)

    elements.append(Paragraph(
        f'Emitido em {issue_date}',
        info_style
    ))

    # Código de verificação
    elements.append(Spacer(1, 0.5*cm))
    elements.append(Paragraph(
        f'Código de Verificação: <b>{certificate.validation_code}</b>',
        info_style
    ))

    # Rodapé com nome da plataforma
    elements.append(Spacer(1, 1.5*cm))
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=14,
        textColor=colors.HexColor('#1a365d'),
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    elements.append(Paragraph('InstructAI - Plataforma de Ensino', footer_style))

    # Construir PDF
    doc.build(elements, onFirstPage=add_border, onLaterPages=add_border)

    # Obter conteúdo do buffer
    pdf_content = buffer.getvalue()
    buffer.close()

    # Retornar como ContentFile
    filename = f'certificado_{certificate.user.id}_{certificate.course.id}.pdf'
    return ContentFile(pdf_content, name=filename)


def add_border(canvas, doc):
    """
    Adiciona borda decorativa ao certificado.
    """
    canvas.saveState()

    # Borda externa (azul escuro)
    canvas.setStrokeColor(colors.HexColor('#1a365d'))
    canvas.setLineWidth(3)
    canvas.rect(1*cm, 1*cm, doc.width + 2*cm, doc.height + 2*cm)

    # Borda interna (azul claro)
    canvas.setStrokeColor(colors.HexColor('#4299e1'))
    canvas.setLineWidth(1)
    canvas.rect(1.2*cm, 1.2*cm, doc.width + 1.6*cm, doc.height + 1.6*cm)

    canvas.restoreState()
