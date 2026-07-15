from sqlalchemy.orm import Session
from app.models.solicitud_parametro import SolicitudParametro


class SolicitudParametroRepository:

    def get_all(self, db: Session):
        return db.query(SolicitudParametro).order_by(SolicitudParametro.oid.desc()).all()

    def create(self, db: Session, solicitud: SolicitudParametro):
        db.add(solicitud)
        db.commit()
        db.refresh(solicitud)
        return solicitud

    def get_by_id(self, db: Session, oid: int):
        return db.query(SolicitudParametro).filter(SolicitudParametro.oid == oid).first()

    def update(self, db: Session, solicitud: SolicitudParametro):
        db.add(solicitud)
        db.commit()
        db.refresh(solicitud)
        return solicitud
