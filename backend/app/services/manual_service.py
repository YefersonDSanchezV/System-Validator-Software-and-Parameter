from datetime import datetime
from sqlalchemy.orm import Session
from app.models.manuales_usuario import ManualUsuario
from app.repositories.manual_repository import ManualRepository
from app.schemas.manual import ManualUsuarioCreate


class ManualService:

    def __init__(self):
        self.repository = ManualRepository()

    def listar(self, db: Session):
        return self.repository.get_all(db)

    def crear(self, db: Session, data: ManualUsuarioCreate):
        nuevo = ManualUsuario(
            modulo=data.modulo,
            titulo=data.titulo,
            version=data.version,
            archivo=data.archivo,
            fecha_registro=datetime.now()
        )
        return self.repository.create(db, nuevo)
