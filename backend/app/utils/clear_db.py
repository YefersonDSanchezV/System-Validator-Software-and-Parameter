from datetime import datetime
import sys
import os

# Ensure project root is on path when executed directly
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.core.database import SessionLocal
from app.models.regversion import RegVersion
from app.models.regvalidacion import RegValidacion
from app.models.firmas import Firma
from app.models.regaprobado import RegAprobado
from app.models.regrechazado import RegRechazado
from app.models.boletines import Boletin
from app.models.manuales_usuario import ManualUsuario
from app.models.solicitud_parametro import SolicitudParametro


def clear_db():
    db = SessionLocal()
    try:
        print("Clearing database tables...")
        db.query(RegRechazado).delete()
        db.query(RegAprobado).delete()
        db.query(RegValidacion).delete()
        db.query(RegVersion).delete()
        db.query(Firma).delete()
        db.query(Boletin).delete()
        db.query(ManualUsuario).delete()
        db.query(SolicitudParametro).delete()
        db.commit()
        print("Database cleared: all demo/static records removed.")
    except Exception as e:
        print("Error while clearing database:", e)
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    clear_db()
