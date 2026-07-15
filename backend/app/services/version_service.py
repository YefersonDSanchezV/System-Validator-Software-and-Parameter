from datetime import datetime

from sqlalchemy.orm import Session

from app.models.regversion import RegVersion
from app.repositories.version_repositories import VersionRepository
from app.schemas.version import VersionCreate
from app.schemas.version import VersionUpdate


class VersionService:

    def __init__(self):
        self.repository = VersionRepository()

    def listar(self, db: Session):
        return self.repository.get_all(db)

    def obtener(self, db: Session, oid: int):

        version = self.repository.get_by_id(db, oid)

        if version is None:
            raise Exception("Versión no encontrada")

        return version

    def crear(self, db: Session, data: VersionCreate):

        nueva = RegVersion(
            titulo=data.titulo,
            descripcion=data.descripcion,
            enlace=data.enlace,
            usuario=data.usuario,
            estado=True,
            fecha_registro=datetime.now()
        )

        return self.repository.create(db, nueva)

    def actualizar(self, db: Session, oid: int, data: VersionUpdate):

        version = self.obtener(db, oid)

        datos = data.model_dump(exclude_unset=True)

        for key, value in datos.items():
            setattr(version, key, value)

        self.repository.update(db)

        return version

    def eliminar(self, db: Session, oid: int):

        version = self.obtener(db, oid)

        self.repository.delete(db, version)