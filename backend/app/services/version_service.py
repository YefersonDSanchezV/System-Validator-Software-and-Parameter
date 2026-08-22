from datetime import datetime
from sqlalchemy.orm import Session

from app.models.regversion import RegVersion, RestauracionDB
from app.repositories.version_repositories import VersionRepository
from app.schemas.version import VersionCreate, VersionUpdate, RestauracionDBCreate


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
            fecha_registro=datetime.now(),
            contenedor_bd=data.contenedor_bd,
            num_compilacion=data.num_compilacion,
            fecha_compilacion=data.fecha_compilacion,
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

    # DB Restoration helpers
    def crear_restauracion(self, db: Session, data: RestauracionDBCreate):
        comp_titulo = None
        if data.compilacion_anclada_oid:
            comp = db.query(RegVersion).filter(RegVersion.oid == data.compilacion_anclada_oid).first()
            if comp:
                comp_titulo = f"{comp.titulo} - {comp.num_compilacion}" if comp.num_compilacion else comp.titulo

        restauracion = RestauracionDB(
            contenedor_bd=data.contenedor_bd,
            fecha_hora_restauracion=datetime.now(),
            fecha_ultima_copia=data.fecha_ultima_copia,
            compilacion_anclada_oid=data.compilacion_anclada_oid,
            compilacion_titulo=comp_titulo,
            usuario=data.usuario or "Coordinador de Sistemas"
        )
        db.add(restauracion)
        db.commit()
        db.refresh(restauracion)
        return restauracion

    def listar_restauraciones(self, db: Session):
        return db.query(RestauracionDB).order_by(RestauracionDB.fecha_hora_restauracion.desc()).all()