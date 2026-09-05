from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SolicitudCreacionUsuarioResponse(BaseModel):
    oid: int
    consecutivo: str
    tipo: str | None = None
    tipos: list[str] | None = None
    solicitante: str
    area: str
    primer_nombre: str
    segundo_nombre: str | None = None
    primer_apellido: str
    segundo_apellido: str
    cedula: str
    telefono: str
    correo: str
    direccion: str
    cargo: str
    nombre_usuario: str
    firma_url: str
    plataforma_otros_nombre: str | None = None
    estado: str
    fecha_registro: datetime

    model_config = ConfigDict(from_attributes=True)


class SolicitudRestablecimientoPasswordCreate(BaseModel):
    plataforma: str
    solicitante: str
    area: str
    usuario: str
    observacion: str
    correo_jefe: str


class SolicitudRestablecimientoPasswordResponse(SolicitudRestablecimientoPasswordCreate):
    oid: int
    consecutivo: str
    estado: str
    fecha_registro: datetime

    model_config = ConfigDict(from_attributes=True)


class PlataformaSolicitudAccesoDTO(BaseModel):
    oid: int | None = None
    nombre: str
    modulo: str
    activa: bool = True
    model_config = ConfigDict(from_attributes=True)


class ConfiguracionSolicitudesAccesoDTO(BaseModel):
    correos_creacion: str = ""
    correos_restablecimiento: str = ""


class UsuarioCreadoCorreoDTO(BaseModel):
    destinatarios: str
    observacion: str
    accesos: list[dict[str, str]]


class RestablecimientoCorreoDTO(BaseModel):
    destinatarios: str
    observacion: str


class EditarNombreUsuarioDTO(BaseModel):
    nombre_usuario: str
