from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, TIMESTAMP

from app.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    oid = Column(Integer, primary_key=True, index=True)
    fecha_hora = Column(TIMESTAMP, nullable=False, default=datetime.utcnow, index=True)
    tipo_accion = Column(String(20), nullable=False, index=True)  # GET, POST, PUT, DELETE, OPTIONS
    ip_equipo = Column(String(50), nullable=False, index=True)
    nombre_equipo = Column(String(255), nullable=True)
    usuario_windows_equipo = Column(String(255), nullable=True)
    modulo = Column(String(100), nullable=False, index=True)
    submodulo = Column(String(50), nullable=False, default="LOGS_SISTEMAS", index=True)
    usuario = Column(String(100), nullable=False, index=True)
    detalle = Column(Text, nullable=True)
    payload_json = Column(Text, nullable=True)
