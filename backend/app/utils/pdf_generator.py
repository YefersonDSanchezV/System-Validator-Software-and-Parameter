import io
from datetime import datetime
from xml.sax.saxutils import escape
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


def _build_base_doc():
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
    return buffer, doc, styles


def _safe(value) -> str:
    return escape(str(value or "")).replace("\n", "<br/>")


def _paragraph_styles(styles):
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Heading1"],
        fontSize=16,
        leading=20,
        textColor=colors.HexColor("#0f172a"),
        fontName="Helvetica-Bold",
        spaceAfter=12
    )
    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=styles["Normal"],
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor("#64748b"),
        spaceAfter=10
    )
    label_style = ParagraphStyle(
        "ReportLabel",
        parent=styles["Normal"],
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#475569"),
        fontName="Helvetica-Bold"
    )
    value_style = ParagraphStyle(
        "ReportValue",
        parent=styles["Normal"],
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor("#0f172a")
    )
    return title_style, subtitle_style, label_style, value_style


def _block_table(content, width=540):
    table = Table([[content]], colWidths=[width])
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("PADDING", (0, 0), (-1, -1), 8),
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
    ]))
    return table


def generate_firmas_report_pdf(payload) -> bytes:
    buffer, doc, styles = _build_base_doc()
    title_style, subtitle_style, label_style, value_style = _paragraph_styles(styles)
    story = []

    story.append(Paragraph("Acta de Reunion - Validacion del Sistema", title_style))
    story.append(Paragraph(f"Version seleccionada: {payload.version_titulo}", subtitle_style))

    metadata_rows = [
        [
            [Paragraph("FECHA DE LA REUNION", label_style), Spacer(1, 3), Paragraph(_safe(payload.fecha_reunion), value_style)],
            [Paragraph("HORA DE INICIO", label_style), Spacer(1, 3), Paragraph(_safe(payload.hora_inicio), value_style)],
            [Paragraph("HORA DE FINALIZACION", label_style), Spacer(1, 3), Paragraph(_safe(payload.hora_fin), value_style)],
        ],
        [
            [Paragraph("TEMA", label_style), Spacer(1, 3), Paragraph(_safe(payload.version_titulo), value_style)],
            [Paragraph("OBJETIVO", label_style), Spacer(1, 3), Paragraph(_safe(payload.version_descripcion), value_style)],
            [Paragraph("TEMAS TRATADOS", label_style), Spacer(1, 3), Paragraph("<br/>".join(_safe(topic) for topic in payload.temas) if payload.temas else "Sin temas registrados.", value_style)],
        ],
    ]

    summary_table = Table(metadata_rows, colWidths=[170, 170, 170])
    summary_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("PADDING", (0, 0), (-1, -1), 6),
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 12))

    attendance_data = [[
        Paragraph("NOMBRE", label_style),
        Paragraph("CARGO", label_style),
        Paragraph("MODULO", label_style),
        Paragraph("FECHA/HORA", label_style),
        Paragraph("ESTADO", label_style),
        Paragraph("FIRMA", label_style),
    ]]
    for row in payload.filas:
        attendance_data.append([
            Paragraph(_safe(row.nombre), value_style),
            Paragraph(_safe(row.cargo or "—"), value_style),
            Paragraph(_safe(row.modulo), value_style),
            Paragraph(_safe(row.fecha_hora), value_style),
            Paragraph("Aprobacion" if row.estado == "aprobacion" else "Rechazo", value_style),
            Paragraph("Registrada" if row.tiene_firma else "Sin firma", value_style),
        ])

    attendance_table = Table(attendance_data, colWidths=[110, 90, 95, 85, 75, 65], repeatRows=1)
    attendance_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("PADDING", (0, 0), (-1, -1), 5),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
    ]))
    story.append(attendance_table)
    story.append(Spacer(1, 12))

    story.append(_block_table([
        Paragraph("CONCLUSIONES", label_style),
        Spacer(1, 4),
        Paragraph(_safe(payload.conclusion), value_style),
    ]))
    story.append(Spacer(1, 10))
    story.append(_block_table([
        Paragraph("OBSERVACIONES", label_style),
        Spacer(1, 4),
        Paragraph(_safe(payload.observacion), value_style),
    ]))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()


def generate_detalles_report_pdf(payload) -> bytes:
    buffer, doc, styles = _build_base_doc()
    title_style, subtitle_style, label_style, value_style = _paragraph_styles(styles)
    story = []

    story.append(Paragraph(_safe(payload.titulo), title_style))
    story.append(Paragraph(f"{_safe(payload.subtitulo)}<br/>Generado: {_safe(payload.generado_en)}", subtitle_style))

    if not payload.filas:
        story.append(_block_table([
            Paragraph("SIN RESULTADOS", label_style),
            Spacer(1, 4),
            Paragraph("No hay observaciones registradas para los filtros seleccionados.", value_style),
        ]))
    else:
        for index, row in enumerate(payload.filas, start=1):
            details = [
                Paragraph(f"REGISTRO {index}", label_style),
                Spacer(1, 4),
                Paragraph(
                    f"<b>Version:</b> {_safe(row.version_titulo)}<br/>"
                    f"<b>Modulo:</b> {_safe(row.modulo)}<br/>"
                    f"<b>Fecha/Hora:</b> {_safe(row.fecha_hora)}<br/>"
                    f"<b>Estado:</b> {'Aprobacion' if row.estado == 'aprobacion' else 'Rechazo'}<br/>"
                    f"<b>Registrado por:</b> {_safe(row.nombre)}",
                    value_style,
                ),
                Spacer(1, 6),
                Paragraph(f"<b>Observacion:</b><br/>{_safe(row.observacion)}", value_style),
            ]

            if row.incidencia:
                details.extend([Spacer(1, 6), Paragraph(f"<b>Incidencia:</b> {_safe(row.incidencia)}", value_style)])
            if row.ruta:
                details.extend([Spacer(1, 4), Paragraph(f"<b>Ruta:</b> {_safe(row.ruta)}", value_style)])

            story.append(_block_table(details))
            story.append(Spacer(1, 10))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()
