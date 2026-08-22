from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.manual import (
    ManualUsuarioCreate,
    ManualUsuarioResponse,
    SolicitudManualCreate,
    SolicitudManualResponse
)
from app.services.manual_service import ManualService
from app.models.manuales_usuario import SolicitudManual, ManualUsuario
from app.utils.file_storage import save_upload_file

router = APIRouter(
    prefix="/manuales",
    tags=["Manuales"]
)

service = ManualService()


@router.get("/", response_model=list[ManualUsuarioResponse])
def listar(db: Session = Depends(get_db)):
    return service.listar(db)


@router.post("/", response_model=ManualUsuarioResponse, status_code=201)
async def crear(
    modulo: str = Form(...),
    titulo: str = Form(...),
    version: str | None = Form(None),
    archivo: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    try:
        archivo_url = None
        if archivo is not None:
            archivo_url = await save_upload_file(archivo)
        data = ManualUsuarioCreate(
            modulo=modulo,
            titulo=titulo,
            version=version,
            archivo=archivo_url,
        )
        return service.crear(db, data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/solicitudes", response_model=SolicitudManualResponse, status_code=201)
def crear_solicitud(data: SolicitudManualCreate, db: Session = Depends(get_db)):
    manual = db.query(ManualUsuario).filter(ManualUsuario.oid == data.manual_oid).first()
    if not manual:
        raise HTTPException(status_code=404, detail="Manual no encontrado")
    sol = SolicitudManual(
        manual_oid=data.manual_oid,
        nombre_solicitante=data.nombre_solicitante.strip(),
        area=data.area.strip(),
        descripcion=data.descripcion.strip(),
        fecha_solicitud=datetime.utcnow(),
        estado="Pendiente"
    )
    db.add(sol)
    db.commit()
    db.refresh(sol)
    return {
        "oid": sol.oid,
        "manual_oid": sol.manual_oid,
        "nombre_solicitante": sol.nombre_solicitante,
        "area": sol.area,
        "descripcion": sol.descripcion,
        "fecha_solicitud": sol.fecha_solicitud,
        "estado": sol.estado,
        "fecha_aprobacion": sol.fecha_aprobacion,
        "manual_titulo": manual.titulo,
        "manual_modulo": str(manual.modulo.value if hasattr(manual.modulo, 'value') else manual.modulo or "")
    }


@router.get("/solicitudes", response_model=list[SolicitudManualResponse])
def listar_solicitudes(db: Session = Depends(get_db)):
    solicitudes = db.query(SolicitudManual).order_by(SolicitudManual.fecha_solicitud.desc()).all()
    res = []
    for sol in solicitudes:
        manual = sol.manual
        res.append({
            "oid": sol.oid,
            "manual_oid": sol.manual_oid,
            "nombre_solicitante": sol.nombre_solicitante,
            "area": sol.area,
            "descripcion": sol.descripcion,
            "fecha_solicitud": sol.fecha_solicitud,
            "estado": sol.estado,
            "fecha_aprobacion": sol.fecha_aprobacion,
            "manual_titulo": manual.titulo if manual else "Desconocido",
            "manual_modulo": str(manual.modulo.value if (manual and hasattr(manual.modulo, 'value')) else (manual.modulo if manual else ""))
        })
    return res


@router.put("/solicitudes/{oid}/aprobar", response_model=SolicitudManualResponse)
def aprobar_solicitud(oid: int, db: Session = Depends(get_db)):
    sol = db.query(SolicitudManual).filter(SolicitudManual.oid == oid).first()
    if not sol:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    sol.estado = "Aprobado"
    sol.fecha_aprobacion = datetime.utcnow()
    db.commit()
    db.refresh(sol)
    manual = sol.manual
    return {
        "oid": sol.oid,
        "manual_oid": sol.manual_oid,
        "nombre_solicitante": sol.nombre_solicitante,
        "area": sol.area,
        "descripcion": sol.descripcion,
        "fecha_solicitud": sol.fecha_solicitud,
        "estado": sol.estado,
        "fecha_aprobacion": sol.fecha_aprobacion,
        "manual_titulo": manual.titulo if manual else "Desconocido",
        "manual_modulo": str(manual.modulo.value if (manual and hasattr(manual.modulo, 'value')) else (manual.modulo if manual else ""))
    }


@router.get("/solicitudes/estado-descarga/{manual_oid}")
def estado_descarga_manual(manual_oid: int, db: Session = Depends(get_db)):
    limit = datetime.utcnow() - timedelta(minutes=30)
    sol_aprobada = (
        db.query(SolicitudManual)
        .filter(
            SolicitudManual.manual_oid == manual_oid,
            SolicitudManual.estado == "Aprobado",
            SolicitudManual.fecha_aprobacion >= limit
        )
        .order_by(SolicitudManual.fecha_aprobacion.desc())
        .first()
    )
    if not sol_aprobada:
        return {"activo": False, "minutos_restantes": 0}

    elapsed = (datetime.utcnow() - sol_aprobada.fecha_aprobacion).total_seconds()
    remaining_secs = max(0, 1800 - elapsed)
    remaining_mins = int(remaining_secs // 60) + 1
    return {"activo": True, "minutos_restantes": remaining_mins}
