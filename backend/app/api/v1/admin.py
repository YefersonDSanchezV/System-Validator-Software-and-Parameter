from fastapi import APIRouter, Header, HTTPException

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.regversion import RegVersion
from app.models.regvalidacion import RegValidacion
from app.models.firmas import Firma
from app.models.regaprobado import RegAprobado
from app.models.regrechazado import RegRechazado
from app.models.boletines import Boletin
from app.models.manuales_usuario import ManualUsuario

router = APIRouter(
    tags=["admin"],
)


@router.post("/admin/clear")
def clear_demo_data(x_admin_key: str | None = Header(None)):
    """Clear demo/static records from database.

    Protect with `X-Admin-Key` header matching `SECRET_KEY`.
    """
    if x_admin_key is None or x_admin_key != settings.SECRET_KEY:
        raise HTTPException(status_code=403, detail="Forbidden")

    db = SessionLocal()
    try:
        db.query(RegRechazado).delete()
        db.query(RegAprobado).delete()
        db.query(RegValidacion).delete()
        db.query(RegVersion).delete()
        db.query(Firma).delete()
        db.query(Boletin).delete()
        db.query(ManualUsuario).delete()
        db.commit()
        return {"status": "ok", "detail": "Demo/static records removed."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()
