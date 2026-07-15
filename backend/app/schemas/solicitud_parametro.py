from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class SolicitudParametroCreate(BaseModel):
    tipo_parametro: str = Field(..., max_length=100)
    descripcion: str = Field(..., max_length=2000)
    fecha_apertura: Optional[date] = None
    fecha_cierre: Optional[date] = None
    solicitante: str = Field(..., max_length=200)


class SolicitudParametroResponse(SolicitudParametroCreate):
    oid: int
    estado: str
    fecha_registro: datetime
    total_valor: Optional[int] = None
    total_unidad: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
