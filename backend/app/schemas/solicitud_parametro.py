from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class SolicitudParametroCreate(BaseModel):
    tipo_parametro: str = Field(..., max_length=100)
    descripcion: str = Field(..., max_length=2000)
    fecha_apertura: Optional[date] = None
    fecha_cierre: Optional[date] = None
    hora_apertura: Optional[str] = None
    hora_cierre: Optional[str] = None
    solicitante: str = Field(..., max_length=200)
    area: Optional[str] = None
    ingreso: Optional[str] = None
    medico: Optional[str] = None


class SolicitudHabilitarAction(BaseModel):
    hcpdiaaut: Optional[int] = None
    hcnmhcrenf: Optional[int] = None
    hcnhaplmed: Optional[int] = None
    observacion: Optional[str] = None


class SolicitudRechazarAction(BaseModel):
    motivo: str = Field(..., min_length=3)


class SolicitudExtensionAction(BaseModel):
    solicitud_extension: str = Field(..., min_length=1)
    observacion: Optional[str] = None


class SolicitudParametroResponse(SolicitudParametroCreate):
    oid: int
    consecutivo: Optional[str] = None
    nombre_paciente: Optional[str] = None
    estado: str
    motivo_rechazo: Optional[str] = None
    solicitud_extension: Optional[str] = None
    observacion_resolucion: Optional[str] = None
    fecha_registro: datetime
    total_valor: Optional[int] = None
    total_unidad: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
