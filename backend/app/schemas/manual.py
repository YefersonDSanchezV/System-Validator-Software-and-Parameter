from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional


class ManualUsuarioBase(BaseModel):
    modulo: str
    titulo: str
    version: str | None = None
    archivo: str | None = None


class ManualUsuarioCreate(ManualUsuarioBase):
    pass


class ManualUsuarioResponse(ManualUsuarioBase):
    oid: int
    fecha_registro: datetime

    model_config = ConfigDict(from_attributes=True)


class SolicitudManualCreate(BaseModel):
    manual_oid: int
    nombre_solicitante: str
    area: str
    descripcion: str


class SolicitudManualResponse(BaseModel):
    oid: int
    manual_oid: int
    nombre_solicitante: str
    area: str
    descripcion: str
    fecha_solicitud: datetime
    estado: str
    fecha_aprobacion: Optional[datetime] = None
    manual_titulo: Optional[str] = None
    manual_modulo: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
