from sqlalchemy import Column, Integer, String, Text, TIMESTAMP

from app.core.database import Base


class SolicitudRestablecimientoPassword(Base):

    __tablename__ = "solicitud_restablecimiento_password"

    oid = Column(Integer, primary_key=True, index=True)
    consecutivo = Column(String(50), nullable=True, index=True)
    plataforma = Column(String(50), nullable=False)
    solicitante = Column(String(200), nullable=False)
    area = Column(String(200), nullable=False)
    usuario = Column(String(150), nullable=False)
    observacion = Column(Text, nullable=False)
    correo_jefe = Column(String(150), nullable=False)
    firma_cierre_url = Column(String(300), nullable=True)
    estado = Column(String(50), nullable=False, default="Pendiente")
    fecha_registro = Column(TIMESTAMP, nullable=False)
