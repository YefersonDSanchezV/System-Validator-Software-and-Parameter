from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.validacion import ObservacionCreate, ObservacionResponse
from app.services.observacion_service import ObservacionService

router = APIRouter(
    prefix="/observaciones",
    tags=["Observaciones"]
)

service = ObservacionService()


@router.get("/", response_model=list[ObservacionResponse])
def listar(db: Session = Depends(get_db)):
    return service.listar(db)


@router.post("/", response_model=ObservacionResponse, status_code=201)
def crear(data: ObservacionCreate, db: Session = Depends(get_db)):
    try:
        return service.crear(db, data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail="No fue posible registrar la observación") from exc
