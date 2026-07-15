from sqlalchemy import Column, Integer, Text, String, ForeignKey, TIMESTAMP
from sqlalchemy.orm import relationship
from app.core.database import Base


class RegRechazado(Base):
    __tablename__ = "regrechazado"

    oid = Column(Integer, primary_key=True)
    regvalidacion_id = Column(
        Integer,
        ForeignKey("regvalidacion.oid", ondelete="CASCADE"),
        nullable=False
    )
    incidencia = Column(String(300), nullable=True)
    ruta = Column(String(300), nullable=True)
    observacion = Column(Text, nullable=True)
    nombre_registra = Column(String(300), nullable=True)
    cargo = Column(String(200), nullable=True)
    firma_id = Column(
        Integer,
        ForeignKey("firmas.oid", ondelete="RESTRICT"),
        nullable=False
    )
    fecha_registro = Column(TIMESTAMP, nullable=False)

    validacion = relationship("RegValidacion", back_populates="rechazos")
    firma = relationship("Firma")
