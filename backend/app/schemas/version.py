from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class VersionBase(BaseModel):
    titulo: str = Field(..., max_length=200)
    descripcion: str
    enlace: str


class VersionCreate(VersionBase):
    # The current UI has no authentication screen yet.  Keep an explicit,
    # traceable default until the authenticated user is supplied by the client.
    usuario: str = Field(default="Coordinador de Sistemas", max_length=100)


class VersionUpdate(BaseModel):
    titulo: str | None = None
    descripcion: str | None = None
    enlace: str | None = None
    estado: bool | None = None


class VersionResponse(VersionBase):
    oid: int
    estado: bool
    fecha_registro: datetime | None
    usuario: str

    model_config = ConfigDict(from_attributes=True)
