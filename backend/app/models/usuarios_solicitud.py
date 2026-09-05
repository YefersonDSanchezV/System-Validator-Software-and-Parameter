from datetime import datetime
from sqlalchemy import Column, Integer, String, TIMESTAMP, Text, Boolean, ForeignKey, Table
from sqlalchemy.orm import relationship

from app.core.database import Base


class UsuarioSolicitud(Base):
    __tablename__ = "usuarios_solicitud"

    id = Column(Integer, primary_key=True, index=True)
    nombre_completo = Column(String(300), nullable=False)
    nombre_usuario = Column(String(150), nullable=False, unique=True, index=True)
    correo_institucional = Column(String(150), nullable=False, unique=True, index=True)
    cargo = Column(String(150), nullable=False)
    password_hash = Column(String(255), nullable=False)
    firma_url = Column(String(300), nullable=False)
    estado = Column(String(20), nullable=False, default="Activo")  # Activo | Inactivo
    created_at = Column(TIMESTAMP, nullable=False, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(100), nullable=True)

    # relación M:N con plataformas vía tabla intermedia
    plataformas = relationship(
        "UsuarioSolicitudPlataforma",
        back_populates="usuario",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class UsuarioSolicitudPlataforma(Base):
    __tablename__ = "usuario_solicitud_plataformas"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios_solicitud.id", ondelete="CASCADE"), nullable=False, index=True)
    plataforma_id = Column(Integer, ForeignKey("plataforma_solicitud_acceso.oid", ondelete="CASCADE"), nullable=False, index=True)

    usuario = relationship("UsuarioSolicitud", back_populates="plataformas")
