from sqlalchemy import Column, ForeignKey, Integer, String, Enum
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.anums import ModuloEnum


class RegValidacion(Base):
    __tablename__ = "regvalidacion"

    oid = Column(Integer, primary_key=True)
    version_id = Column(
        Integer,
        ForeignKey("regversion.oid")
    )
    modulo = Column(
        Enum(ModuloEnum, name="enum_modulos", create_type=False),
        nullable=False
    )
    ruta = Column(String(500))

    version = relationship(
        "RegVersion",
        back_populates="validaciones"
    )
    aprobaciones = relationship(
        "RegAprobado",
        back_populates="validacion"
    )
    rechazos = relationship(
        "RegRechazado",
        back_populates="validacion"
    )