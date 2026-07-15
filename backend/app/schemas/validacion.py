from pydantic import BaseModel, Field


class ObservacionCreate(BaseModel):
    version_id: int
    modulo: str = Field(..., max_length=27)
    nombre: str = Field(..., max_length=500)
    cargo: str = Field(..., max_length=200)
    estado: str  # "aprobacion" | "rechazo"
    observacion: str
    incidencia: str | None = None
    ruta: str | None = None
    firma: str | None = None  # base64 data URL


class ObservacionResponse(BaseModel):
    id: str
    versionId: str
    modulo: str
    nombre: str
    cargo: str | None = None
    fechaHora: str
    estado: str
    observacion: str
    incidencia: str | None = None
    ruta: str | None = None
    firma: str | None = None
