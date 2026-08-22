from sqlalchemy import Column, Integer, String, TIMESTAMP, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.anums import ModuloEnum


class ManualUsuario(Base):
    __tablename__ = "manuales_usuarios"

    oid = Column(Integer, primary_key=True)
    modulo = Column(
        Enum(ModuloEnum, name="enum_modulos", create_type=False),
        nullable=False
    )
    titulo = Column(String(300), nullable=False)
    version = Column(String(100))
    fecha_registro = Column(TIMESTAMP, nullable=False)
    archivo = Column(String(500))


class SolicitudManual(Base):
    __tablename__ = "solicitudes_manuales"

    oid = Column(Integer, primary_key=True, index=True)
    manual_oid = Column(Integer, ForeignKey("manuales_usuarios.oid", ondelete="CASCADE"), nullable=False)
    nombre_solicitante = Column(String(200), nullable=False)
    area = Column(String(200), nullable=False)
    descripcion = Column(Text, nullable=False)
    fecha_solicitud = Column(TIMESTAMP, nullable=False)
    estado = Column(String(50), default="Pendiente")
    fecha_aprobacion = Column(TIMESTAMP, nullable=True)

    manual = relationship("ManualUsuario")
