from sqlalchemy import Column, Integer, Text, String, ForeignKey, TIMESTAMP
from sqlalchemy.orm import relationship
from app.core.database import Base


class RegAprobado(Base):
    __tablename__ = "regaprobados"

    oid = Column(Integer, primary_key=True)
    regvalidacion_id = Column(
        Integer,
        ForeignKey("regvalidacion.oid", ondelete="CASCADE"),
        nullable=False
    )
    observacion = Column(Text, nullable=False)
    nombre_registra = Column(String(500), nullable=False)
    cargo = Column(String(200), nullable=True)
    firma_id = Column(
        Integer,
        ForeignKey("firmas.oid", ondelete="RESTRICT"),
        nullable=False
    )
    fecha_registro = Column(TIMESTAMP, nullable=False)

    validacion = relationship("RegValidacion", back_populates="aprobaciones")
    firma = relationship("Firma")
