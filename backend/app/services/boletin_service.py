from datetime import datetime
from sqlalchemy.orm import Session
from app.models.boletines import Boletin
from app.repositories.boletin_repository import BoletinRepository
from app.schemas.boletin import BoletinCreate


class BoletinService:

    def __init__(self):
        self.repository = BoletinRepository()

    def listar(self, db: Session):
        return self.repository.get_all(db)

    def crear(self, db: Session, data: BoletinCreate):
        nuevo = Boletin(
            tipo_documento=data.tipo_documento,
            consecutivo=data.consecutivo,
            fecha=data.fecha or datetime.now(),
            modulo=data.modulo,
            opcion=data.opcion,
            impacto=data.impacto,
            categoria=data.categoria,
            con_documentacion=data.con_documentacion,
            asunto=data.asunto,
            clase_documento=data.clase_documento,
            advertencia=data.advertencia,
            instructivo_descripcion=data.instructivo_descripcion,
            archivo=data.archivo,
            fecha_registro=datetime.now()
        )
        return self.repository.create(db, nuevo)
