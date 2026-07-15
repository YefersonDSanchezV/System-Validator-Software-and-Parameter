from sqlalchemy import Column, Integer, Text
from app.core.database import Base


class Firma(Base):
    __tablename__ = "firmas"

    oid = Column(Integer, primary_key=True)
    firma = Column(Text, nullable=False)
