from datetime import datetime
from sqlalchemy import Column, Date, Integer, String, Text, TIMESTAMP, Boolean, JSON

from app.core.database import Base


class SolicitudParametro(Base):

    __tablename__ = "solicitud_parametro"

    oid = Column(Integer, primary_key=True, index=True)
    consecutivo = Column(String(50), nullable=True, index=True)
    tipo_parametro = Column(String(100), nullable=False)
    descripcion = Column(Text, nullable=False)
    fecha_apertura = Column(Date, nullable=True)
    fecha_cierre = Column(Date, nullable=True)
    hora_apertura = Column(String(20), nullable=True)
    hora_cierre = Column(String(20), nullable=True)
    total_valor = Column(Integer, nullable=True)
    total_unidad = Column(String(20), nullable=True)
    solicitante = Column(String(200), nullable=False)
    area = Column(String(200), nullable=True)
    ingreso = Column(String(50), nullable=True)
    medico = Column(String(200), nullable=True)
    estado = Column(String(50), nullable=False, default="Pendiente")
    motivo_rechazo = Column(Text, nullable=True)
    solicitud_extension = Column(String(100), nullable=True)
    observacion_resolucion = Column(Text, nullable=True)
    fecha_registro = Column(TIMESTAMP, nullable=False)


class ConfiguracionParametros(Base):
    __tablename__ = "configuracion_parametros"

    id = Column(Integer, primary_key=True, index=True)
    hc_default = Column(Integer, nullable=False, default=30)
    enf_hcrenf_default = Column(Integer, nullable=False, default=48)
    enf_haplmed_default = Column(Integer, nullable=False, default=48)
    hora_restablecimiento = Column(String(10), nullable=False, default="20:05")
    auto_restablecer = Column(Boolean, nullable=False, default=True)
    tipos_habilitados = Column(JSON, nullable=False, default=["Historia Clinica", "Enfermeria", "Otros"])
    correos_historia_clinica = Column(Text, nullable=True)
    correos_enfermeria = Column(Text, nullable=True)
    correos_otros = Column(Text, nullable=True)
    updated_at = Column(TIMESTAMP, nullable=False, default=datetime.utcnow)
