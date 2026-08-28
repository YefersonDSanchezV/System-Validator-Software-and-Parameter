from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, Literal


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


class ReporteFirmaFila(BaseModel):
    nombre: str
    cargo: Optional[str] = None
    modulo: str
    fecha_hora: str
    estado: str
    tiene_firma: bool = False
    firma: Optional[str] = None
    observacion: Optional[str] = None
    incidencia: Optional[str] = None
    ruta: Optional[str] = None
    captura: Optional[list[str]] = None


class ReporteFirmasPdfRequest(BaseModel):
    version_titulo: str
    version_descripcion: str
    fecha_reunion: str
    hora_inicio: str
    hora_fin: str
    conclusion: str
    observacion: str
    temas: list[str]
    filas: list[ReporteFirmaFila]


class ReporteDetalleFila(BaseModel):
    version_titulo: str
    modulo: str
    fecha_hora: str
    estado: str
    nombre: str
    observacion: str
    incidencia: Optional[str] = None
    ruta: Optional[str] = None


class ReporteDetallesPdfRequest(BaseModel):
    titulo: str
    subtitulo: str
    generado_en: str
    filas: list[ReporteDetalleFila]


class EnviarCorreoVersionRequest(BaseModel):
    tipo: Literal["pruebas", "produccion"]
    mejoras: str = Field(..., min_length=10, description="Descripción de mejoras")
    fecha_despliegue: Optional[datetime] = Field(default=None, description="Fecha y hora de despliegue para producción")


class ConfiguracionVersionCorreosDTO(BaseModel):
    correos_pruebas: Optional[str] = Field(default="", description="Correos separados por coma para pruebas")
    correos_produccion: Optional[str] = Field(default="", description="Correos separados por coma para producción")


class LogCorreoVersionResponse(BaseModel):
    oid: int
    version_oid: Optional[int] = None
    tipo: str
    destinatarios: Optional[str] = None
    asunto: Optional[str] = None
    mejoras: Optional[str] = None
    fecha_despliegue: Optional[datetime] = None
    fecha_envio: datetime
    usuario: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
