from fastapi import APIRouter, Depends, HTTPException, Response, Header
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.schemas.version import (
    VersionCreate,
    VersionResponse,
    VersionUpdate,
    RestauracionDBCreate,
    RestauracionDBResponse,
    ReporteFirmasPdfRequest,
    ReporteDetallesPdfRequest,
    EnviarCorreoVersionRequest,
    ConfiguracionVersionCorreosDTO,
    LogCorreoVersionResponse,
)
from app.services.version_service import VersionService
from app.utils.pdf_generator import generate_firmas_report_pdf, generate_detalles_report_pdf

router = APIRouter(
    prefix="/versions",
    tags=["Versiones"]
)

service = VersionService()


@router.get("/", response_model=list[VersionResponse])
def listar(db: Session = Depends(get_db)):
    return service.listar(db)


@router.get("/restauraciones", response_model=list[RestauracionDBResponse])
def listar_restauraciones(db: Session = Depends(get_db)):
    return service.listar_restauraciones(db)


@router.get("/config/correos", response_model=ConfiguracionVersionCorreosDTO)
def get_config_correos(db: Session = Depends(get_db)):
    conf = service.get_config_correos(db)
    return {"correos_pruebas": conf.correos_pruebas or "", "correos_produccion": conf.correos_produccion or ""}


@router.put("/config/correos", response_model=ConfiguracionVersionCorreosDTO)
def update_config_correos(data: ConfiguracionVersionCorreosDTO, db: Session = Depends(get_db)):
    conf = service.update_config_correos(db, data.correos_pruebas or "", data.correos_produccion or "")
    return {"correos_pruebas": conf.correos_pruebas or "", "correos_produccion": conf.correos_produccion or ""}


@router.get("/logs/correos", response_model=list[LogCorreoVersionResponse])
def listar_logs_correos(version_oid: Optional[int] = None, db: Session = Depends(get_db)):
    return service.listar_logs(db, version_oid)


@router.post("/{oid}/enviar-correo")
def enviar_correo_version(oid: int, data: EnviarCorreoVersionRequest, db: Session = Depends(get_db), x_user_name: Optional[str] = Header(default=None)):
    try:
        usuario = (x_user_name or "").strip() or "Coordinador de Sistemas"
        return service.enviar_correo_version(db, oid, data.tipo, data.mejoras, data.fecha_despliegue, usuario)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"No fue posible enviar el correo: {exc}") from exc


@router.post("/reportes/firmas/pdf")
def descargar_reporte_firmas_pdf(data: ReporteFirmasPdfRequest):
    try:
        pdf_bytes = generate_firmas_report_pdf(data)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="reporte_firmas_validacion.pdf"'}
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail="No fue posible generar el PDF del reporte de firmas.") from exc


@router.post("/reportes/detalles/pdf")
def descargar_reporte_detalles_pdf(data: ReporteDetallesPdfRequest):
    try:
        pdf_bytes = generate_detalles_report_pdf(data)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="reporte_detalles_validacion.pdf"'}
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail="No fue posible generar el PDF del reporte de detalles.") from exc


@router.post("/restauraciones", response_model=RestauracionDBResponse, status_code=201)
def crear_restauracion(data: RestauracionDBCreate, db: Session = Depends(get_db)):
    try:
        return service.crear_restauracion(db, data)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail="No fue posible registrar la restauración de BD") from exc


@router.delete("/restauraciones/{oid}", status_code=200)
def eliminar_restauracion(oid: int, db: Session = Depends(get_db)):
    try:
        service.eliminar_restauracion(db, oid)
        return {"message": "Restauración eliminada con éxito"}
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail="No fue posible eliminar la restauración de BD") from exc


@router.put("/{oid}/set-produccion", response_model=VersionResponse)
def set_produccion(oid: int, db: Session = Depends(get_db)):
    try:
        return service.set_produccion(db, oid)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail="No fue posible marcar la versión como producción") from exc


@router.get("/{oid}", response_model=VersionResponse)
def obtener(oid: int, db: Session = Depends(get_db)):
    try:
        return service.obtener(db, oid)
    except Exception as e:
        raise HTTPException(404, str(e))


@router.post("/", response_model=VersionResponse, status_code=201)
def crear(data: VersionCreate, db: Session = Depends(get_db)):
    try:
        return service.crear(db, data)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail="No fue posible crear la versión") from exc


@router.put("/{oid}", response_model=VersionResponse)
def actualizar(
    oid: int,
    data: VersionUpdate,
    db: Session = Depends(get_db)
):
    try:
        return service.actualizar(db, oid, data)
    except Exception as e:
        db.rollback()
        raise HTTPException(404, str(e))


@router.delete("/{oid}")
def eliminar(oid: int, db: Session = Depends(get_db)):
    try:
        service.eliminar(db, oid)
        return {"message": "Versión eliminada"}
    except Exception as e:
        db.rollback()
        raise HTTPException(404, str(e))
