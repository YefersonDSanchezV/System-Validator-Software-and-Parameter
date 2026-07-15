from datetime import datetime
from pydantic import BaseModel, ConfigDict


class BoletinBase(BaseModel):
    tipo_documento: str | None = None
    consecutivo: int | None = None
    fecha: datetime | None = None
    modulo: str | None = None
    opcion: str | None = None
    impacto: str | None = None
    categoria: str | None = None
    con_documentacion: bool = False
    asunto: str | None = None
    clase_documento: str | None = None
    advertencia: str | None = None
    instructivo_descripcion: str | None = None
    archivo: str | None = None


class BoletinCreate(BoletinBase):
    pass


class BoletinResponse(BoletinBase):
    oid: int
    fecha_registro: datetime

    model_config = ConfigDict(from_attributes=True)
