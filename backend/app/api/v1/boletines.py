from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.boletin import BoletinResponse, BoletinPeriodo, BoletinImportResponse
from app.services.boletin_service import BoletinService
from app.models.boletines import Boletin
from app.utils.pdf_generator import generate_boletin_pdf

router = APIRouter(
    prefix="/boletines",
    tags=["Boletines"]
)

service = BoletinService()


@router.get("/", response_model=list[BoletinResponse])
def listar(
    mes: int | None = Query(None, ge=1, le=12),
    anio: int | None = Query(None, ge=2000, le=2100),
    db: Session = Depends(get_db),
):
    return service.listar(db, mes=mes, anio=anio)


@router.get("/periodos", response_model=list[BoletinPeriodo])
def listar_periodos(db: Session = Depends(get_db)):
    return service.listar_periodos(db)


@router.get("/exportar-excel")
def exportar_excel(
    mes: int = Query(..., ge=1, le=12),
    anio: int = Query(..., ge=2000, le=2100),
    consecutivo: str | None = Query(None),
    modulo: str | None = Query(None),
    fecha: str | None = Query(None),
    opcion: str | None = Query(None),
    impacto: str | None = Query(None),
    categoria: str | None = Query(None),
    clase_documento: str | None = Query(None),
    asunto: str | None = Query(None),
    db: Session = Depends(get_db),
):
    try:
        output, filename = service.exportar_excel_filtrado(
            db,
            mes=mes,
            anio=anio,
            consecutivo=consecutivo,
            modulo=modulo,
            fecha=fecha,
            opcion=opcion,
            impacto=impacto,
            categoria=categoria,
            clase_documento=clase_documento,
            asunto=asunto,
        )
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error generando Excel: {exc}") from exc


@router.get("/{oid}/pdf")
def descargar_pdf(oid: int, db: Session = Depends(get_db)):
    boletin = db.query(Boletin).filter(Boletin.oid == oid).first()
    if not boletin:
        raise HTTPException(status_code=404, detail="Boletín no encontrado")
    try:
        pdf_bytes = generate_boletin_pdf(boletin)
        filename = f"boletin_{boletin.consecutivo or oid}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando PDF: {str(e)}")


@router.post("/", response_model=BoletinImportResponse, status_code=201)
async def crear(
    mes: int = Form(...),
    anio: int = Form(...),
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    try:
        if not archivo.filename.lower().endswith(".xlsx"):
            raise HTTPException(status_code=400, detail="El archivo debe ser de tipo .xlsx")
        content = await archivo.read()
        return service.importar_excel(db, excel_bytes=content, mes=mes, anio=anio)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
