from sqlalchemy import Boolean
from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy import TIMESTAMP

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

    validaciones = relationship(
        "RegValidacion",
        back_populates="version",
        cascade="all, delete"
    )