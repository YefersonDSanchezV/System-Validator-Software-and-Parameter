from sqlalchemy import Column, Integer, String, TIMESTAMP, Enum
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
