from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.manual import ManualUsuarioCreate, ManualUsuarioResponse
from app.services.manual_service import ManualService
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
