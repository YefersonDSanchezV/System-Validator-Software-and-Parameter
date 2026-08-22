from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional


class VersionBase(BaseModel):
    titulo: str = Field(..., max_length=200)
    descripcion: str
    enlace: str
    contenedor_bd: Optional[str] = Field(default=None, max_length=50) # DGEMPRES99, DGEMPRES98, DGEMPRES10
    num_compilacion: Optional[str] = Field(default=None, max_length=100)
    fecha_compilacion: Optional[datetime] = None


class VersionCreate(VersionBase):
    usuario: str = Field(default="Coordinador de Sistemas", max_length=100)


class VersionUpdate(BaseModel):
    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    enlace: Optional[str] = None
    estado: Optional[bool] = None
    contenedor_bd: Optional[str] = None
    num_compilacion: Optional[str] = None
    fecha_compilacion: Optional[datetime] = None


class VersionResponse(VersionBase):
    oid: int
    estado: bool
    fecha_registro: Optional[datetime] = None
    usuario: str

    model_config = ConfigDict(from_attributes=True)


class RestauracionDBCreate(BaseModel):
    contenedor_bd: str # DGEMPRES99, DGEMPRES98, DGEMPRES10
    fecha_ultima_copia: datetime
    compilacion_anclada_oid: Optional[int] = None
    usuario: Optional[str] = "Coordinador de Sistemas"


class RestauracionDBResponse(BaseModel):
    oid: int
    contenedor_bd: str
    fecha_hora_restauracion: datetime
    fecha_ultima_copia: datetime
    compilacion_anclada_oid: Optional[int] = None
    compilacion_titulo: Optional[str] = None
    usuario: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
