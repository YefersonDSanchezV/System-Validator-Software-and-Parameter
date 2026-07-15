from sqlalchemy.orm import Session
from app.models.boletines import Boletin


class BoletinRepository:

    def get_all(self, db: Session):
        return db.query(Boletin).order_by(Boletin.oid.desc()).all()

    def get_by_id(self, db: Session, oid: int):
        return db.query(Boletin).filter(Boletin.oid == oid).first()

    def create(self, db: Session, boletin: Boletin):
        db.add(boletin)
        db.commit()
        db.refresh(boletin)
        return boletin
