from datetime import datetime
from pydantic import BaseModel, ConfigDict


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
