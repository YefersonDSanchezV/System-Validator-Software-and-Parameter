from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.solicitud_parametro import SolicitudParametroCreate, SolicitudParametroResponse
from app.services.solicitud_parametro_service import SolicitudParametroService

router = APIRouter(
    prefix="/solicitud-parametro",
    tags=["Solicitud Parámetro"]
)

service = SolicitudParametroService()

@router.get("/", response_model=list[SolicitudParametroResponse])
def listar(db: Session = Depends(get_db)):
    return service.listar(db)

@router.post("/", response_model=SolicitudParametroResponse, status_code=201)
def crear(data: SolicitudParametroCreate, db: Session = Depends(get_db)):
    try:
        return service.crear(db, data)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.put("/{oid}/aprobar", response_model=SolicitudParametroResponse)
def aprobar(oid: int, db: Session = Depends(get_db)):
    try:
        return service.aprobar(db, oid)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc
