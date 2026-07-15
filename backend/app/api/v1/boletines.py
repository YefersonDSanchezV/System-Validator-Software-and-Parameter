from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.boletin import BoletinCreate, BoletinResponse
from app.services.boletin_service import BoletinService
from app.utils.file_storage import save_upload_file

router = APIRouter(
    prefix="/boletines",
    tags=["Boletines"]
)

service = BoletinService()


@router.get("/", response_model=list[BoletinResponse])
def listar(db: Session = Depends(get_db)):
    return service.listar(db)


@router.post("/", response_model=BoletinResponse, status_code=201)
async def crear(
    tipo_documento: str | None = Form(None),
    consecutivo: int | None = Form(None),
    fecha: datetime | None = Form(None),
    modulo: str | None = Form(None),
    opcion: str | None = Form(None),
    impacto: str | None = Form(None),
    categoria: str | None = Form(None),
    con_documentacion: bool = Form(False),
    asunto: str | None = Form(None),
    clase_documento: str | None = Form(None),
    advertencia: str | None = Form(None),
    instructivo_descripcion: str | None = Form(None),
    archivo: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    try:
        archivo_url = None
        if archivo is not None:
            archivo_url = await save_upload_file(archivo)
        data = BoletinCreate(
            tipo_documento=tipo_documento,
            consecutivo=consecutivo,
            fecha=fecha,
            modulo=modulo,
            opcion=opcion,
            impacto=impacto,
            categoria=categoria,
            con_documentacion=con_documentacion,
            asunto=asunto,
            clase_documento=clase_documento,
            advertencia=advertencia,
            instructivo_descripcion=instructivo_descripcion,
            archivo=archivo_url,
        )
        return service.crear(db, data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
