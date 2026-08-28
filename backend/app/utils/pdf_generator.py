import io
import os
import re
import base64
import logging
from datetime import datetime
from xml.sax.saxutils import escape
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.enums import TA_CENTER, TA_LEFT

logger = logging.getLogger(__name__)

MODULOS = [
    "ADMISIONES","CARTERA","CONTABILIDAD","CONTRATOS_IPS",
    "FACTURACION","HOSPITALIZACION","INVENTARIOS","PAGOS",
    "TESORERIA","GENERALES_SEGURIDAD","CITAS_MEDICAS",
    "HISTORIAS_CLINICAS","ACTIVOS_FIJOS","NOMINA",
    "INFORMACION_FINANCIERA_NIIF","GESTION_GERENCIAL",
    "WEB_CITAS_MEDICAS","PROGRAMACION_DE_CIRUGIAS","OTROS",
]

MODULO_LABELS = {
    "CONTRATOS_IPS": "CONTRATOS IPS",
    "GENERALES_SEGURIDAD": "GENERALES & SEGURIDAD",
    "CITAS_MEDICAS": "CITAS MEDICAS",
    "HISTORIAS_CLINICAS": "HISTORIAS CLINICAS",
    "ACTIVOS_FIJOS": "ACTIVOS FIJOS",
    "WEB_CITAS_MEDICAS": "WEB CITAS MEDICAS",
    "PROGRAMACION_DE_CIRUGIAS": "PROGRAMACION DE CIRUGIAS",
}


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
        leftMargin=24,
        rightMargin=24,
        topMargin=24,
        bottomMargin=24
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


# ── Helpers for firmas report ──────────────────────────────────────────────

def _label_for_modulo(modulo: str) -> str:
    if not modulo:
        return "OTROS"
    return MODULO_LABELS.get(str(modulo), str(modulo))

def _decode_base64_image(b64_str: str):
    """Decode a dataURL or raw base64 into bytes, return (bytes, format_hint) or None."""
    if not b64_str or not isinstance(b64_str, str):
        return None
    s = b64_str.strip()
    if not s:
        return None
    # handle JSON array stringified incorrectly (defensive)
    if s.startswith("["):
        try:
            import json as _json
            arr = _json.loads(s)
            if isinstance(arr, list) and arr:
                s = str(arr[0])
        except Exception:
            pass
    # data URL prefix
    if "," in s and "base64" in s[:50]:
        try:
            s = s.split(",", 1)[1]
        except Exception:
            pass
    # remove whitespace
    s = re.sub(r"\s+", "", s)
    # pad
    missing = len(s) % 4
    if missing:
        s += "=" * (4 - missing)
    try:
        data = base64.b64decode(s)
        # basic PNG/JPEG magic check not needed
        if len(data) < 10:
            return None
        return data
    except Exception:
        return None

def _make_signature_image(b64_str: str, max_w=130, max_h=45):
    data = _decode_base64_image(b64_str)
    if not data:
        return None
    try:
        bio = io.BytesIO(data)
        # Use PIL to verify and get dimensions if needed, but reportlab can load from BytesIO
        # We create RLImage and scale preserving aspect
        img = RLImage(bio)
        # scale down to max
        # RLImage will have imageWidth/Height after loading if Pillow available
        try:
            iw = float(img.imageWidth)
            ih = float(img.imageHeight)
            if iw > 0 and ih > 0:
                scale = min(max_w / iw, max_h / ih, 1.0)
                img.drawWidth = iw * scale
                img.drawHeight = ih * scale
            else:
                img.drawWidth = max_w
                img.drawHeight = max_h
        except Exception:
            img.drawWidth = max_w
            img.drawHeight = max_h
        return img
    except Exception as exc:
        logger.debug("No se pudo crear imagen de firma: %s", exc)
        return None

def _make_captura_image(b64_str: str, max_w=200, max_h=120):
    data = _decode_base64_image(b64_str)
    if not data:
        return None
    try:
        bio = io.BytesIO(data)
        img = RLImage(bio)
        try:
            iw = float(img.imageWidth)
            ih = float(img.imageHeight)
            if iw > 0 and ih > 0:
                scale = min(max_w / iw, max_h / ih, 1.0)
                img.drawWidth = iw * scale
                img.drawHeight = ih * scale
            else:
                img.drawWidth = max_w
                img.drawHeight = max_h
        except Exception:
            img.drawWidth = max_w
            img.drawHeight = max_h
        return img
    except Exception:
        return None

def _load_file_image(path_candidates, max_w=120, max_h=56):
    for p in path_candidates:
        try:
            if p and os.path.exists(p):
                img = RLImage(p)
                try:
                    iw = float(img.imageWidth)
                    ih = float(img.imageHeight)
                    if iw > 0 and ih > 0:
                        scale = min(max_w / iw, max_h / ih, 1.0)
                        img.drawWidth = iw * scale
                        img.drawHeight = ih * scale
                except Exception:
                    img.drawWidth = max_w
                    img.drawHeight = max_h
                return img
        except Exception:
            continue
    return None

def _get_assets_paths():
    base_here = os.path.dirname(os.path.abspath(__file__))
    # backend/app/assets/logo.png
    candidates_logo = [
        os.path.join(base_here, "assets", "logo.png"),
        os.path.join(base_here, "..", "assets", "logo.png"),
        "/DATA/Documents/programas icvc/System-Validator-Software-and-Parameter/frontend/src/image/logo.png",
        os.path.join(os.getcwd(), "frontend/src/image/logo.png"),
        os.path.join(os.getcwd(), "backend/app/assets/logo.png"),
    ]
    candidates_firmas = [
        os.path.join(base_here, "assets", "firmas.png"),
        os.path.join(base_here, "..", "assets", "firmas.png"),
        "/DATA/Documents/programas icvc/System-Validator-Software-and-Parameter/frontend/src/image/firmas.png",
        os.path.join(os.getcwd(), "frontend/src/image/firmas.png"),
        os.path.join(os.getcwd(), "backend/app/assets/firmas.png"),
    ]
    # normalize
    candidates_logo = [os.path.normpath(p) for p in candidates_logo]
    candidates_firmas = [os.path.normpath(p) for p in candidates_firmas]
    return candidates_logo, candidates_firmas


def generate_firmas_report_pdf(payload) -> bytes:
    """
    Genera el Acta de Reunión idéntica al Reporte de Firmas de Directivos del frontend
    (frontend/src/app/App.tsx -> ReportFirmas -> generatePDF).
    """
    buffer, doc, styles = _build_base_doc()
    # Styles matching frontend HTML: borders #111, header #334155, section titles #c8d9ea
    s_header_title = ParagraphStyle("HdrTitle", parent=styles["Normal"], fontSize=10, leading=12, alignment=TA_CENTER, fontName="Helvetica-Bold", textColor=colors.HexColor("#334155"))
    s_small = ParagraphStyle("Small", parent=styles["Normal"], fontSize=7, leading=9, textColor=colors.HexColor("#334155"), fontName="Helvetica", alignment=TA_LEFT)
    s_small_center = ParagraphStyle("SmallCenter", parent=s_small, alignment=TA_CENTER)
    s_th = ParagraphStyle("TH", parent=styles["Normal"], fontSize=7, leading=9, fontName="Helvetica-Bold", textColor=colors.HexColor("#0f172a"), alignment=TA_LEFT)
    s_th_center = ParagraphStyle("THCenter", parent=s_th, alignment=TA_CENTER)
    s_td = ParagraphStyle("TD", parent=styles["Normal"], fontSize=7.5, leading=10, fontName="Helvetica", textColor=colors.HexColor("#0f172a"))
    s_td_center = ParagraphStyle("TDCenter", parent=s_td, alignment=TA_CENTER)
    s_section = ParagraphStyle("SectionTitle", parent=styles["Normal"], fontSize=8, leading=10, fontName="Helvetica-Bold", textColor=colors.HexColor("#0f172a"), alignment=TA_CENTER)
    # Color constants
    border_color = colors.HexColor("#111111")
    section_bg = colors.HexColor("#c8d9ea")
    header_bg = colors.white
    th_bg = colors.HexColor("#f8fafc")

    story = []
    page_width = 540  # usable width with margins 24
    candidates_logo, candidates_firmas = _get_assets_paths()

    # ── Header block (3 columns) ───────────────────────────────────────────
    logo_img = _load_file_image(candidates_logo, max_w=120, max_h=42)
    if logo_img:
        logo_cell = [logo_img]
    else:
        logo_cell = [Paragraph('<font color="#b91c1c"><b>Falta la imagen: src/image/logo.png</b></font>', s_small)]
    header_table_data = [[
        logo_cell,
        [Paragraph("ACTA DE REUNION", s_header_title)],
        [Paragraph("Codigo: CAL-A-001<br/>Version: 02<br/>Pagina: 1 de 1", s_small)]
    ]]
    header_col_widths = [150, 240, 150]
    header_tbl = Table(header_table_data, colWidths=header_col_widths)
    header_tbl.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("BOX", (0, 0), (-1, -1), 0.7, border_color),
        ("INNERGRID", (0, 0), (-1, -1), 0.7, border_color),
        ("BACKGROUND", (0, 0), (-1, -1), header_bg),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(header_tbl)

    # ── Meta table (5 rows) ────────────────────────────────────────────────
    # Normalize payload access (supports both dict and pydantic)
    def _get(obj, key, default=None):
        if isinstance(obj, dict):
            return obj.get(key, default)
        return getattr(obj, key, default) if hasattr(obj, key) else default

    version_titulo = _get(payload, "version_titulo") or "Sin título"
    version_desc = _get(payload, "version_descripcion") or ""
    fecha_reunion = _get(payload, "fecha_reunion") or ""
    hora_inicio = _get(payload, "hora_inicio") or ""
    hora_fin = _get(payload, "hora_fin") or ""
    conclusion = _get(payload, "conclusion") or ""
    observacion_txt = _get(payload, "observacion") or ""
    temas_raw = _get(payload, "temas") or []
    filas_raw = _get(payload, "filas") or []

    # Meta rows: 4 columns, rows 2-4 have colspan
    meta_data = [
        [Paragraph("<b>Fecha de la reunion</b>", s_th), Paragraph(_safe(fecha_reunion), s_td), Paragraph("<b>Lugar</b>", s_th), Paragraph("Virtual", s_td)],
        [Paragraph("<b>Hora de inicio</b>", s_th), Paragraph(_safe(hora_inicio), s_td), Paragraph("<b>Hora de finalizacion</b>", s_th), Paragraph(_safe(hora_fin), s_td)],
        [Paragraph("<b>Tema</b>", s_th), Paragraph(_safe(version_titulo), s_td), Paragraph("", s_td), Paragraph("", s_td)],
        [Paragraph("<b>Tipo</b>", s_th), Paragraph("Seguimiento &nbsp;&nbsp; [ X ] &nbsp; Revision &nbsp;&nbsp; Divulgacion &nbsp;&nbsp; Otro", s_td), Paragraph("", s_td), Paragraph("", s_td)],
        [Paragraph("<b>Objetivo</b>", s_th), Paragraph(_safe(version_desc), s_td), Paragraph("", s_td), Paragraph("", s_td)],
    ]
    meta_tbl = Table(meta_data, colWidths=[110, 160, 110, 160])
    meta_tbl.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOX", (0, 0), (-1, -1), 0.7, border_color),
        ("INNERGRID", (0, 0), (-1, -1), 0.7, border_color),
        ("BACKGROUND", (0, 0), (0, -1), th_bg),
        ("BACKGROUND", (2, 0), (2, 1), th_bg),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        # span for Tema, Tipo, Objetivo rows
        ("SPAN", (1, 2), (-1, 2)),
        ("SPAN", (1, 3), (-1, 3)),
        ("SPAN", (1, 4), (-1, 4)),
    ]))
    story.append(meta_tbl)

    # helper for section title
    def _section_title(text):
        t = Table([[Paragraph(f"<b>{escape(text)}</b>", s_section)]], colWidths=[page_width])
        t.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.7, border_color),
            ("BACKGROUND", (0, 0), (-1, -1), section_bg),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        return t

    # ── TEMAS A TRATAR ────────────────────────────────────────────────────
    story.append(_section_title("TEMAS A TRATAR"))
    # Build tema display list: always show full MODULOS + extras to be identical to frontend
    # payload.temas may already be the full list from frontend (labels) or raw set from email.
    # Normalize to labels
    def _normalize_temas_payload(temas_list, filas_list):
        # filas_list contains modulo raw
        present_labels = set(_label_for_modulo(_get(f, "modulo") or "") for f in filas_list)
        # If temas_list is non-empty, treat them as potential labels/raw mix
        # Decide if temas_list already covers all MODULOS (frontend does)
        if temas_list:
            # Convert to labels
            normalized = [_label_for_modulo(t) for t in temas_list]
            # If already contains all MODULOS labels (or close), keep as is
            # Otherwise expand to full list + extras
            existing_set = set(normalized)
            # check if covers at least MODULOS count -> keep
            if len(normalized) >= len(MODULOS):
                return normalized, present_labels
            # otherwise expand
            full = [_label_for_modulo(m) for m in MODULOS]
            extras = [t for t in normalized if t not in full]
            # also add any present not in full/normalized
            for pl in present_labels:
                if pl not in full and pl not in extras:
                    extras.append(pl)
            return full + extras, present_labels
        else:
            full = [_label_for_modulo(m) for m in MODULOS]
            extras = [pl for pl in present_labels if pl not in full]
            return full + extras, present_labels

    temas_display, present_labels = _normalize_temas_payload(temas_raw, filas_raw)

    temas_header = [Paragraph("<b>Tema (enuncie brevemente el tema a tratar)</b>", s_th), Paragraph("<b>Tratado Si/No</b>", s_th_center)]
    temas_data = [temas_header]
    for tema_label in temas_display:
        is_tratado = "SI" if tema_label in present_labels else "NO"
        temas_data.append([Paragraph(_safe(tema_label), s_td), Paragraph(is_tratado, s_td_center)])
    temas_tbl = Table(temas_data, colWidths=[440, 100], repeatRows=1)
    temas_tbl.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOX", (0, 0), (-1, -1), 0.7, border_color),
        ("INNERGRID", (0, 0), (-1, -1), 0.7, border_color),
        ("BACKGROUND", (0, 0), (-1, 0), th_bg),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f9fafb")]),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(temas_tbl)

    # ── DESCRIPCION DE LOS TEMAS TRATADOS ────────────────────────────────
    story.append(_section_title("DESCRIPCION DE LOS TEMAS TRATADOS"))
    if not filas_raw:
        desc_data = [[Paragraph("Sin observaciones registradas.", s_td)]]
        desc_tbl = Table(desc_data, colWidths=[page_width])
        desc_tbl.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.7, border_color),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(desc_tbl)
    else:
        desc_rows = []
        for idx, f in enumerate(filas_raw, start=1):
            modulo_raw = _get(f, "modulo") or ""
            modulo_label = _label_for_modulo(modulo_raw)
            estado = _get(f, "estado") or ""
            estado_txt = "Aprobación" if str(estado).lower() == "aprobacion" else "Rechazo" if str(estado).lower() == "rechazo" else str(estado)
            obs_txt = _get(f, "observacion") or ""
            incidencia = _get(f, "incidencia") or ""
            ruta = _get(f, "ruta") or ""
            # Build paragraph: "1. [MODULO] Aprobación: observacion"
            header_line = f"{idx}. [{_safe(modulo_label)}] {escape(estado_txt)}: {_safe(obs_txt) if obs_txt else '<i>Sin observación</i>'}"
            # Include incidencia/ruta if present
            extra_lines = ""
            if incidencia:
                extra_lines += f"<br/><b>Incidencia:</b> {_safe(incidencia)}"
            if ruta:
                extra_lines += f"<br/><b>Ruta:</b> {_safe(ruta)}"
            para = Paragraph(header_line + extra_lines, s_td)
            cell_content = [para]
            # capturas: list of b64 strings
            capturas = _get(f, "captura") or []
            if isinstance(capturas, str):
                # handle json encoded list or single b64
                try:
                    import json as _json
                    parsed = _json.loads(capturas)
                    if isinstance(parsed, list):
                        capturas = parsed
                    else:
                        capturas = [capturas]
                except Exception:
                    capturas = [capturas]
            if capturas and isinstance(capturas, list):
                for cap in capturas:
                    if not cap or not isinstance(cap, str):
                        continue
                    # skip empty placeholders
                    img = _make_captura_image(cap, max_w=220, max_h=110)
                    if img:
                        cell_content.append(Spacer(1, 4))
                        cell_content.append(img)
            desc_rows.append([cell_content])
        desc_tbl = Table(desc_rows, colWidths=[page_width])
        desc_tbl.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BOX", (0, 0), (-1, -1), 0.7, border_color),
            ("INNERGRID", (0, 0), (-1, -1), 0.7, border_color),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(desc_tbl)

    # ── COMPROMISOS ──────────────────────────────────────────────────────
    story.append(_section_title("COMPROMISOS"))
    comp_header = [
        Paragraph("<b>Actividad</b>", s_th_center),
        Paragraph("<b>Responsable</b>", s_th_center),
        Paragraph("<b>Fecha de cumplimiento</b>", s_th_center),
        Paragraph("<b>Seguimiento</b>", s_th_center),
    ]
    # blank row with height
    blank_cell = Paragraph("", s_td)
    comp_data = [comp_header, [blank_cell, blank_cell, blank_cell, blank_cell]]
    comp_tbl = Table(comp_data, colWidths=[135, 135, 135, 135], repeatRows=1)
    comp_tbl.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOX", (0, 0), (-1, -1), 0.7, border_color),
        ("INNERGRID", (0, 0), (-1, -1), 0.7, border_color),
        ("BACKGROUND", (0, 0), (-1, 0), th_bg),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, 0), 4),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 4),
        ("TOPPADDING", (0, 1), (-1, 1), 22),
        ("BOTTOMPADDING", (0, 1), (-1, 1), 22),
    ]))
    story.append(comp_tbl)

    # ── CONCLUSIONES ─────────────────────────────────────────────────────
    story.append(_section_title("CONCLUSIONES"))
    conc_para = Paragraph(_safe(conclusion) if str(conclusion).strip() else "&nbsp;", s_td)
    conc_tbl = Table([[ [conc_para] ]], colWidths=[page_width])
    conc_tbl.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOX", (0, 0), (-1, -1), 0.7, border_color),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("BACKGROUND", (0, 0), (-1, -1), colors.white),
    ]))
    story.append(conc_tbl)

    # ── OBSERVACIONES ────────────────────────────────────────────────────
    story.append(_section_title("OBSERVACIONES"))
    obs_para = Paragraph(_safe(observacion_txt) if str(observacion_txt).strip() else "&nbsp;", s_td)
    obs_tbl = Table([[ [obs_para] ]], colWidths=[page_width])
    obs_tbl.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOX", (0, 0), (-1, -1), 0.7, border_color),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    story.append(obs_tbl)

    # ── ASISTENCIAS ─────────────────────────────────────────────────────
    story.append(_section_title("ASISTENCIAS"))
    # deduplicate by nombre__cargo
    asistencia_map = {}
    asistencia_order = []
    for f in filas_raw:
        nombre = str(_get(f, "nombre") or "Sin nombre").strip()
        cargo = str(_get(f, "cargo") or "").strip()
        key = f"{nombre}__{cargo}"
        if key not in asistencia_map:
            # firma may be in 'firma' field or via tiene_firma
            firma_b64 = _get(f, "firma")
            tiene = bool(_get(f, "tiene_firma"))
            # also if firma string exists, consider has signature
            if firma_b64 and isinstance(firma_b64, str) and firma_b64.strip():
                tiene = True
            asistencia_map[key] = {"nombre": nombre, "cargo": cargo or "—", "firma": firma_b64, "tiene": tiene}
            asistencia_order.append(key)
        else:
            # if existing has no firma but new has, update
            existing = asistencia_map[key]
            new_firma = _get(f, "firma")
            if (not existing.get("firma")) and new_firma:
                existing["firma"] = new_firma
                existing["tiene"] = True

    if not asistencia_order:
        asist_data = [
            [Paragraph("<b>Nombre y apellido</b>", s_th), Paragraph("<b>Cargo</b>", s_th), Paragraph("<b>Firma</b>", s_th_center)],
            [Paragraph("Sin asistentes con firma registrada.", s_td_center), Paragraph("", s_td), Paragraph("", s_td)]
        ]
        asist_tbl = Table(asist_data, colWidths=[200, 170, 170])
        asist_tbl.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BOX", (0, 0), (-1, -1), 0.7, border_color),
            ("INNERGRID", (0, 0), (-1, -1), 0.7, border_color),
            ("BACKGROUND", (0, 0), (-1, 0), th_bg),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("ALIGN", (2, 0), (2, -1), "CENTER"),
        ]))
        story.append(asist_tbl)
    else:
        asist_header = [
            Paragraph("<b>Nombre y apellido</b>", s_th),
            Paragraph("<b>Cargo</b>", s_th),
            Paragraph("<b>Firma</b>", s_th_center),
        ]
        asist_data = [asist_header]
        for key in asistencia_order:
            entry = asistencia_map[key]
            nombre_para = Paragraph(_safe(entry["nombre"]), s_td)
            cargo_para = Paragraph(_safe(entry["cargo"]), s_td)
            # firma cell
            firma_b64 = entry.get("firma")
            img = _make_signature_image(firma_b64, max_w=130, max_h=45) if firma_b64 else None
            if img:
                firma_cell = [img]
            else:
                if entry.get("tiene"):
                    firma_cell = [Paragraph("Registrada", s_td_center)]
                else:
                    firma_cell = [Paragraph("Sin firma", s_td_center)]
            asist_data.append([ [nombre_para], [cargo_para], firma_cell ])
        asist_tbl = Table(asist_data, colWidths=[200, 170, 170], repeatRows=1)
        asist_tbl.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BOX", (0, 0), (-1, -1), 0.7, border_color),
            ("INNERGRID", (0, 0), (-1, -1), 0.7, border_color),
            ("BACKGROUND", (0, 0), (-1, 0), th_bg),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("ALIGN", (2, 0), (2, -1), "CENTER"),
        ]))
        story.append(asist_tbl)

    # ── Footer strip ─────────────────────────────────────────────────────
    footer_img = _load_file_image(candidates_firmas, max_w=page_width, max_h=90)
    if footer_img:
        # Scale to full width
        try:
            iw = float(footer_img.imageWidth)
            ih = float(footer_img.imageHeight)
            if iw > 0:
                target_w = page_width
                scale = target_w / iw
                footer_img.drawWidth = target_w
                footer_img.drawHeight = ih * scale
        except Exception:
            footer_img.drawWidth = page_width
            footer_img.drawHeight = 60
        # wrap in table with border to mimic frontend
        footer_tbl = Table([[ [footer_img] ]], colWidths=[page_width])
        footer_tbl.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.7, border_color),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(Spacer(1, 12))
        story.append(footer_tbl)
    else:
        story.append(Spacer(1, 12))
        fallback = Table([[Paragraph('<font color="#b91c1c"><b>Falta la imagen: src/image/firmas.png</b></font>', s_small_center)]], colWidths=[page_width])
        fallback.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.7, border_color),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(fallback)

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
