from sqlalchemy.orm import Session
from app.models.regversion import RegVersion


class VersionRepository:

    def get_all(self, db: Session):
        return db.query(RegVersion).order_by(RegVersion.oid.desc()).all()

    def get_by_id(self, db: Session, oid: int):
        return db.query(RegVersion).filter(RegVersion.oid == oid).first()

    def create(self, db: Session, version: RegVersion):

        db.add(version)

        db.commit()

        db.refresh(version)

        return version

    def update(self, db: Session):

        db.commit()

    def delete(self, db: Session, version: RegVersion):

        db.delete(version)

        db.commit()