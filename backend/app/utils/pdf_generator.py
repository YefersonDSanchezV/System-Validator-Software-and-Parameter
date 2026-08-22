import io
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors


def generate_boletin_pdf(boletin) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=16,
        leading=20,
        textColor=colors.HexColor('#0f172a'),
        fontName='Helvetica-Bold',
        spaceAfter=15
    )

    label_style = ParagraphStyle(
        'FieldLabel',
        parent=styles['Normal'],
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#64748b'),
        fontName='Helvetica-Bold'
    )

    value_style = ParagraphStyle(
        'FieldValue',
        parent=styles['Normal'],
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor('#1e293b'),
        fontName='Helvetica'
    )

    story = []

    story.append(Paragraph("Detalle del Boletín", title_style))
    story.append(Spacer(1, 10))

    def make_cell(label: str, value: str):
        val_str = str(value) if value is not None else ""
        content = [
            Paragraph(label.upper(), label_style),
            Spacer(1, 3),
            Paragraph(val_str, value_style)
        ]
        return content

    fecha_str = boletin.fecha.strftime("%Y-%m-%d") if isinstance(boletin.fecha, datetime) else str(boletin.fecha or "")
    doc_str = "Sí" if boletin.con_documentacion else "No"
    impacto_str = str(boletin.impacto.value if hasattr(boletin.impacto, 'value') else boletin.impacto or "")
    modulo_str = str(boletin.modulo.value if hasattr(boletin.modulo, 'value') else boletin.modulo or "")

    data_rows = [
        [
            make_cell("Tipo de documento", boletin.tipo_documento or ""),
            make_cell("Consecutivo", str(boletin.consecutivo or ""))
        ],
        [
            make_cell("Fecha", fecha_str),
            make_cell("Módulo", modulo_str)
        ],
        [
            make_cell("Opción", boletin.opcion or ""),
            make_cell("Impacto", impacto_str)
        ],
        [
            make_cell("Categoría", boletin.categoria or ""),
            make_cell("Con documentación", doc_str)
        ],
        [
            make_cell("Clase de documento", boletin.clase_documento or ""),
            make_cell("Advertencia", boletin.advertencia or "")
        ]
    ]

    t_grid = Table(data_rows, colWidths=[270, 270])
    t_grid.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('PADDING', (0, 0), (-1, -1), 6),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
    ]))
    story.append(t_grid)
    story.append(Spacer(1, 12))

    # Asunto block
    asunto_content = [
        Paragraph("ASUNTO", label_style),
        Spacer(1, 4),
        Paragraph((boletin.asunto or "").replace('\n', '<br/>'), value_style)
    ]
    t_asunto = Table([[asunto_content]], colWidths=[540])
    t_asunto.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
    ]))
    story.append(t_asunto)
    story.append(Spacer(1, 12))

    # Instructivos - Descripción block
    instructivo_content = [
        Paragraph("INSTRUCTIVOS - DESCRIPCIÓN", label_style),
        Spacer(1, 4),
        Paragraph((boletin.instructivo_descripcion or "").replace('\n', '<br/>'), value_style)
    ]
    t_instructivo = Table([[instructivo_content]], colWidths=[540])
    t_instructivo.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
    ]))
    story.append(t_instructivo)

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()
