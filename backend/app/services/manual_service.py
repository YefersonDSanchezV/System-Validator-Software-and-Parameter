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

    def actualizar(self, db: Session, oid: int, data):
        manual = self.repository.get_by_id(db, oid)
        if not manual:
            raise ValueError("Manual no encontrado")
        if data.modulo is not None:
            manual.modulo = data.modulo
        if data.titulo is not None:
            manual.titulo = data.titulo
        if data.version is not None:
            manual.version = data.version
        if data.archivo is not None:
            manual.archivo = data.archivo
        return self.repository.update(db, manual)
