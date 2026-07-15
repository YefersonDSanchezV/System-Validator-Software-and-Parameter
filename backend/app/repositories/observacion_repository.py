from sqlalchemy.orm import Session
from app.models.regvalidacion import RegValidacion
from app.models.regaprobado import RegAprobado
from app.models.regrechazado import RegRechazado
from app.models.firmas import Firma


class ObservacionRepository:

    def get_all_validations(self, db: Session):
        return db.query(RegValidacion).all()

    def get_all_aprobados(self, db: Session):
        return db.query(RegAprobado).all()

    def get_all_rechazados(self, db: Session):
        return db.query(RegRechazado).all()

    def create_firma(self, db: Session, firma_content: str):
        firma_obj = Firma(firma=firma_content)
        db.add(firma_obj)
        db.flush()  # to get oid before committing the whole transaction
        return firma_obj

    def create_validacion(self, db: Session, validacion: RegValidacion):
        db.add(validacion)
        db.flush()
        return validacion

    def create_aprobado(self, db: Session, aprobado: RegAprobado):
        db.add(aprobado)
        db.flush()
        return aprobado

    def create_rechazado(self, db: Session, rechazado: RegRechazado):
        db.add(rechazado)
        db.flush()
        return rechazado

    def commit_transaction(self, db: Session):
        db.commit()
