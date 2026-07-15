from sqlalchemy import Column, Date, Integer, String, Text, TIMESTAMP

from app.core.database import Base


class SolicitudParametro(Base):

    __tablename__ = "solicitud_parametro"

    oid = Column(Integer, primary_key=True, index=True)
    tipo_parametro = Column(String(100), nullable=False)
    descripcion = Column(Text, nullable=False)
    fecha_apertura = Column(Date, nullable=True)
    fecha_cierre = Column(Date, nullable=True)
    total_valor = Column(Integer, nullable=True)
    total_unidad = Column(String(20), nullable=True)
    solicitante = Column(String(200), nullable=False)
    estado = Column(String(50), nullable=False, default="Pendiente")
    fecha_registro = Column(TIMESTAMP, nullable=False)
