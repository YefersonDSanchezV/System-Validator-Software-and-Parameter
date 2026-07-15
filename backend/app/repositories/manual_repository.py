from sqlalchemy.orm import Session
from app.models.manuales_usuario import ManualUsuario


class ManualRepository:

    def get_all(self, db: Session):
        return db.query(ManualUsuario).order_by(ManualUsuario.oid.desc()).all()

    def get_by_id(self, db: Session, oid: int):
        return db.query(ManualUsuario).filter(ManualUsuario.oid == oid).first()

    def create(self, db: Session, manual: ManualUsuario):
        db.add(manual)
        db.commit()
        db.refresh(manual)
        return manual
