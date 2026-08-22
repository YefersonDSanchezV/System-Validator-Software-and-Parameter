from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.boletines import Boletin


class BoletinRepository:

    def get_all(self, db: Session, mes: int | None = None, anio: int | None = None):
        query = db.query(Boletin)
        if mes is not None:
            query = query.filter(Boletin.mes == mes)
        if anio is not None:
            query = query.filter(Boletin.anio == anio)
        return query.order_by(Boletin.fecha.desc().nullslast(), Boletin.oid.desc()).all()

    def get_by_id(self, db: Session, oid: int):
        return db.query(Boletin).filter(Boletin.oid == oid).first()

    def create(self, db: Session, boletin: Boletin):
        db.add(boletin)
        db.commit()
        db.refresh(boletin)
        return boletin

    def create_many(self, db: Session, boletines: list[Boletin]):
        db.add_all(boletines)
        db.commit()
        return boletines

    def list_periodos(self, db: Session):
        rows = (
            db.query(Boletin.mes, Boletin.anio)
            .distinct()
            .order_by(desc(Boletin.anio), desc(Boletin.mes))
            .all()
        )
        return rows

    def delete_by_period(self, db: Session, mes: int, anio: int):
        db.query(Boletin).filter(Boletin.mes == mes, Boletin.anio == anio).delete()
        db.commit()
