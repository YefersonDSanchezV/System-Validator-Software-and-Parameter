from sqlalchemy import Boolean, Column, Integer, String, Text, TIMESTAMP, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class RegVersion(Base):
    __tablename__ = "regversion"

    oid = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(200), nullable=False)
    descripcion = Column(Text)
    enlace = Column(String(500))
    estado = Column(Boolean, default=True)
    fecha_registro = Column(TIMESTAMP)
    usuario = Column(String(100))

    # New compilation and DB container fields
    contenedor_bd = Column(String(50), nullable=True) # DGEMPRES99, DGEMPRES98, DGEMPRES10
    num_compilacion = Column(String(100), nullable=True)
    fecha_compilacion = Column(TIMESTAMP, nullable=True)
    es_produccion = Column(Boolean, default=False)

    validaciones = relationship(
        "RegValidacion",
        back_populates="version",
        cascade="all, delete"
    )


class RestauracionDB(Base):
    __tablename__ = "restauraciones_db"

    oid = Column(Integer, primary_key=True, index=True)
    contenedor_bd = Column(String(50), nullable=False)
    fecha_hora_restauracion = Column(TIMESTAMP, nullable=False)
    fecha_ultima_copia = Column(TIMESTAMP, nullable=False)
    compilacion_anclada_oid = Column(Integer, ForeignKey("regversion.oid", ondelete="SET NULL"), nullable=True)
    compilacion_titulo = Column(String(200), nullable=True)
    usuario = Column(String(100), nullable=True)

    compilacion = relationship("RegVersion")


class ConfiguracionVersionCorreos(Base):
    __tablename__ = "configuracion_version_correos"

    id = Column(Integer, primary_key=True, index=True)
    correos_pruebas = Column(Text, nullable=True)
    correos_produccion = Column(Text, nullable=True)
    updated_at = Column(TIMESTAMP, nullable=True)


class LogCorreoVersion(Base):
    __tablename__ = "log_correos_enviados"

    oid = Column(Integer, primary_key=True, index=True)
    version_oid = Column(Integer, ForeignKey("regversion.oid", ondelete="SET NULL"), nullable=True)
    tipo = Column(String(20), nullable=False)
    destinatarios = Column(Text, nullable=True)
    asunto = Column(String(300), nullable=True)
    mejoras = Column(Text, nullable=True)
    fecha_despliegue = Column(TIMESTAMP, nullable=True)
    fecha_envio = Column(TIMESTAMP, nullable=False)
    usuario = Column(String(100), nullable=True)


class PermisoUsuarioCoordinador(Base):
    __tablename__ = "permisos_usuario_coordinador"

    id = Column(Integer, primary_key=True, index=True)
    usuario = Column(String(50), unique=True, nullable=False)
    permisos = Column(Text, nullable=False)
    updated_at = Column(TIMESTAMP, nullable=True)