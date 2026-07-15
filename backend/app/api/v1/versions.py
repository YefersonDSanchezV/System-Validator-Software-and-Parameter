from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from sqlalchemy.orm import Session

from app.core.database import get_db

from app.schemas.version import VersionCreate
from app.schemas.version import VersionResponse
from app.schemas.version import VersionUpdate

from app.services.version_service import VersionService

router = APIRouter(
    prefix="/versions",
    tags=["Versiones"]
)

service = VersionService()


@router.get("/", response_model=list[VersionResponse])
def listar(db: Session = Depends(get_db)):
    return service.listar(db)


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
