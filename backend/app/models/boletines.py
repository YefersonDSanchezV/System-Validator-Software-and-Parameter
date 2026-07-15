from sqlalchemy import Column, Integer, String, BigInteger, TIMESTAMP, Boolean, Text, Enum
from app.core.database import Base
from app.models.anums import ModuloEnum, ImpactoEnum


class Boletin(Base):
    __tablename__ = "boletines"

    oid = Column(Integer, primary_key=True)
    tipo_documento = Column(String(20))
    consecutivo = Column(BigInteger)
    fecha = Column(TIMESTAMP)
    modulo = Column(Enum(ModuloEnum, name="enum_modulos", create_type=False))
    opcion = Column(String(500))
    impacto = Column(Enum(ImpactoEnum, name="enum_impacto", create_type=False))
    categoria = Column(String(200))
    con_documentacion = Column(Boolean, default=False)
    asunto = Column(Text)
    clase_documento = Column(String(200))
    advertencia = Column(Text)
    instructivo_descripcion = Column(Text)
    fecha_registro = Column(TIMESTAMP, nullable=False)
    archivo = Column(String(500))
