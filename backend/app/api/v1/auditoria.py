from datetime import datetime
from io import BytesIO
from typing import Optional, List

from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import desc
from sqlalchemy.orm import Session
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

from app.core.database import get_db
from app.models.auditoria import AuditLog

router = APIRouter(
    prefix="/auditoria",
    tags=["Auditoría"]
)


class AuditLogResponse(BaseModel):
    oid: int
    fecha_hora: str
    tipo_accion: str
    ip_equipo: str
    modulo: str
    usuario: str
    detalle: Optional[str] = None

    class Config:
        from_attributes = True


@router.get("/", response_model=List[AuditLogResponse])
def listar_auditoria(
    tipo_accion: Optional[str] = Query(None),
    ip_equipo: Optional[str] = Query(None),
    modulo: Optional[str] = Query(None),
    usuario: Optional[str] = Query(None),
    fecha_inicio: Optional[str] = Query(None),
    fecha_fin: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog)

    if tipo_accion and tipo_accion.trim():
        query = query.filter(AuditLog.tipo_accion.ilike(f"%{tipo_accion.strip()}%"))
    if ip_equipo and ip_equipo.strip():
        query = query.filter(AuditLog.ip_equipo.ilike(f"%{ip_equipo.strip()}%"))
    if modulo and modulo.strip():
        query = query.filter(AuditLog.modulo.ilike(f"%{modulo.strip()}%"))
    if usuario and usuario.strip():
        query = query.filter(AuditLog.usuario.ilike(f"%{usuario.strip()}%"))
    if fecha_inicio:
        try:
            dt_ini = datetime.fromisoformat(fecha_inicio.replace("Z", ""))
            query = query.filter(AuditLog.fecha_hora >= dt_ini)
        except Exception:
            pass
    if fecha_fin:
        try:
            dt_fin = datetime.fromisoformat(fecha_fin.replace("Z", ""))
            query = query.filter(AuditLog.fecha_hora <= dt_fin)
        except Exception:
            pass

    logs = query.order_by(desc(AuditLog.fecha_hora)).limit(1000).all()

    return [
        AuditLogResponse(
            oid=log.oid,
            fecha_hora=log.fecha_hora.strftime("%Y-%m-%d %H:%M:%S") if log.fecha_hora else "",
            tipo_accion=log.tipo_accion,
            ip_equipo=log.ip_equipo,
            modulo=log.modulo,
            usuario=log.usuario,
            detalle=log.detalle
        )
        for log in logs
    ]


@router.get("/exportar-excel")
def exportar_auditoria_excel(
    tipo_accion: Optional[str] = Query(None),
    ip_equipo: Optional[str] = Query(None),
    modulo: Optional[str] = Query(None),
    usuario: Optional[str] = Query(None),
    fecha_inicio: Optional[str] = Query(None),
    fecha_fin: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog)

    if tipo_accion and tipo_accion.strip():
        query = query.filter(AuditLog.tipo_accion.ilike(f"%{tipo_accion.strip()}%"))
    if ip_equipo and ip_equipo.strip():
        query = query.filter(AuditLog.ip_equipo.ilike(f"%{ip_equipo.strip()}%"))
    if modulo and modulo.strip():
        query = query.filter(AuditLog.modulo.ilike(f"%{modulo.strip()}%"))
    if usuario and usuario.strip():
        query = query.filter(AuditLog.usuario.ilike(f"%{usuario.strip()}%"))
    if fecha_inicio:
        try:
            dt_ini = datetime.fromisoformat(fecha_inicio.replace("Z", ""))
            query = query.filter(AuditLog.fecha_hora >= dt_ini)
        except Exception:
            pass
    if fecha_fin:
        try:
            dt_fin = datetime.fromisoformat(fecha_fin.replace("Z", ""))
            query = query.filter(AuditLog.fecha_hora <= dt_fin)
        except Exception:
            pass

    logs = query.order_by(desc(AuditLog.fecha_hora)).all()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Logs de Auditoría"

    # Styling
    header_fill = PatternFill(start_color="0778AC", end_color="0778AC", fill_type="solid")
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    data_font = Font(name="Calibri", size=10)
    thin_border = Border(
        left=Side(style="thin", color="E2E8F0"),
        right=Side(style="thin", color="E2E8F0"),
        top=Side(style="thin", color="E2E8F0"),
        bottom=Side(style="thin", color="E2E8F0"),
    )

    headers = ["ID Log", "Fecha y Hora", "Tipo de Acción", "Módulo", "Usuario", "IP del Equipo", "Detalle de la Acción"]
    ws.append(headers)

    for col_num in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col_num)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")

    for log in logs:
        ws.append([
            log.oid,
            log.fecha_hora.strftime("%Y-%m-%d %H:%M:%S") if log.fecha_hora else "",
            log.tipo_accion,
            log.modulo,
            log.usuario,
            log.ip_equipo,
            log.detalle or ""
        ])

    # Format rows
    for row in ws.iter_rows(min_row=2, max_row=ws.max_row, min_col=1, max_col=len(headers)):
        for cell in row:
            cell.font = data_font
            cell.border = thin_border
            cell.alignment = Alignment(vertical="center")

    # Auto-adjust column widths
    for col in ws.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = openpyxl.utils.get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = min(max(max_len + 4, 12), 60)

    output = BytesIO()
    wb.save(output)
    output.seek(0)

    filename = f"reporte_auditoria_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"'
    }
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers
    )
