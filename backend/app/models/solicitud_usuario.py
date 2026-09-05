from sqlalchemy import Column, Integer, String, TIMESTAMP, JSON, Text, Boolean

from app.core.database import Base


class SolicitudCreacionUsuario(Base):

    __tablename__ = "solicitud_creacion_usuario"

    oid = Column(Integer, primary_key=True, index=True)
    consecutivo = Column(String(50), nullable=True, index=True)
    # tipo se conserva para solicitudes creadas antes del soporte multi-plataforma.
    tipo = Column(String(50), nullable=True)
    tipos = Column(JSON, nullable=True)
    solicitante = Column(String(200), nullable=False)
    area = Column(String(200), nullable=False)
    primer_nombre = Column(String(100), nullable=False)
    segundo_nombre = Column(String(100), nullable=True)
    primer_apellido = Column(String(100), nullable=False)
    segundo_apellido = Column(String(100), nullable=False)
    cedula = Column(String(20), nullable=False)
    telefono = Column(String(20), nullable=False)
    correo = Column(String(150), nullable=False)
    direccion = Column(String(300), nullable=False)
    cargo = Column(String(150), nullable=False)
    nombre_usuario = Column(String(150), nullable=False)
    firma_url = Column(String(300), nullable=False)
    firma_cierre_url = Column(String(300), nullable=True)
    plataforma_otros_nombre = Column(String(200), nullable=True)
    estado = Column(String(50), nullable=False, default="Pendiente")
    fecha_registro = Column(TIMESTAMP, nullable=False)


class PlataformaSolicitudAcceso(Base):
    __tablename__ = "plataforma_solicitud_acceso"

    oid = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    modulo = Column(String(40), nullable=False)  # creacion_usuario | restablecimiento_password
    activa = Column(Boolean, nullable=False, default=True)


class ConfiguracionSolicitudesAcceso(Base):
    __tablename__ = "configuracion_solicitudes_acceso"

    id = Column(Integer, primary_key=True, index=True)
    correos_creacion = Column(Text, nullable=True)
    correos_restablecimiento = Column(Text, nullable=True)
