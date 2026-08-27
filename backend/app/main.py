from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.models.solicitud_parametro import SolicitudParametro
from app.utils.file_storage import ensure_upload_dir

import logging
import os
from datetime import datetime
from contextlib import asynccontextmanager

from app.api.v1 import (
    versions,
    observaciones,
    boletines,
    manuales,
    admin,
    solicitud_parametro,
    parametros_clinicos,
    auth, # auth is in api.v1.auth based on dir structure
    reportes, # reportes is in api.v1.reportes
    auditoria,
)
from app.core.audit_middleware import AuditMiddleware
from app.core.scheduler import init_scheduler

# Configure root logger so all app.* loggers emit to stdout (visible in Docker logs)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

logger = logging.getLogger(__name__)


def initialize_database():
    Base.metadata.create_all(bind=engine)

    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE regaprobados ADD COLUMN IF NOT EXISTS cargo VARCHAR(200)"))
        conn.execute(text("ALTER TABLE regrechazado ADD COLUMN IF NOT EXISTS cargo VARCHAR(200)"))
        conn.execute(text("ALTER TABLE solicitud_parametro ADD COLUMN IF NOT EXISTS total_valor INTEGER"))
        conn.execute(text("ALTER TABLE solicitud_parametro ADD COLUMN IF NOT EXISTS total_unidad VARCHAR(20)"))
        conn.execute(text("ALTER TABLE solicitud_parametro ALTER COLUMN fecha_apertura DROP NOT NULL"))
        conn.execute(text("ALTER TABLE solicitud_parametro ALTER COLUMN fecha_cierre DROP NOT NULL"))
        conn.execute(text("ALTER TABLE solicitud_parametro ADD COLUMN IF NOT EXISTS hora_apertura VARCHAR(20)"))
        conn.execute(text("ALTER TABLE solicitud_parametro ADD COLUMN IF NOT EXISTS hora_cierre VARCHAR(20)"))
        conn.execute(text("ALTER TABLE solicitud_parametro ADD COLUMN IF NOT EXISTS area VARCHAR(200)"))
        conn.execute(text("ALTER TABLE solicitud_parametro ADD COLUMN IF NOT EXISTS ingreso VARCHAR(50)"))
        conn.execute(text("ALTER TABLE solicitud_parametro ADD COLUMN IF NOT EXISTS medico VARCHAR(200)"))
        conn.execute(text("ALTER TABLE solicitud_parametro ADD COLUMN IF NOT EXISTS consecutivo VARCHAR(50)"))
        conn.execute(text("ALTER TABLE solicitud_parametro ADD COLUMN IF NOT EXISTS motivo_rechazo TEXT"))
        conn.execute(text("ALTER TABLE solicitud_parametro ADD COLUMN IF NOT EXISTS solicitud_extension VARCHAR(100)"))
        conn.execute(text("ALTER TABLE solicitud_parametro ADD COLUMN IF NOT EXISTS observacion_resolucion TEXT"))

        conn.execute(text("ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS nombre_equipo VARCHAR(255)"))
        conn.execute(text("ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS usuario_windows_equipo VARCHAR(255)"))
        conn.execute(text("ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS submodulo VARCHAR(50)"))
        conn.execute(text("ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS payload_json TEXT"))
        conn.execute(text("UPDATE audit_logs SET submodulo = 'LOGS_SISTEMAS' WHERE submodulo IS NULL"))

        # Email recipient columns for configuracion_parametros
        conn.execute(text("ALTER TABLE configuracion_parametros ADD COLUMN IF NOT EXISTS correos_historia_clinica TEXT"))
        conn.execute(text("ALTER TABLE configuracion_parametros ADD COLUMN IF NOT EXISTS correos_enfermeria TEXT"))
        conn.execute(text("ALTER TABLE configuracion_parametros ADD COLUMN IF NOT EXISTS correos_otros TEXT"))

        # Backfill missing consecutivos
        rows = conn.execute(text("SELECT oid, fecha_registro FROM solicitud_parametro WHERE consecutivo IS NULL ORDER BY oid ASC")).fetchall()
        counts = {}
        for r in rows:
            dt = r[1] or datetime.now()
            prefix = f"{dt.year}-{dt.month:02d}"
            counts[prefix] = counts.get(prefix, 0) + 1
            cons = f"{prefix}-{counts[prefix]:03d}"
            conn.execute(text("UPDATE solicitud_parametro SET consecutivo = :cons WHERE oid = :oid"), {"cons": cons, "oid": r[0]})

        # Migrate legacy estado values to 'Autorizado Solicitud Previa'
        conn.execute(text("UPDATE solicitud_parametro SET estado = 'Autorizado Solicitud Previa' WHERE estado IN ('Habilitado por extensión', 'Habilitado por extension', 'Habilitado por extencion')"))

        # Ensure default row in configuracion_parametros
        conf_exists = conn.execute(text("SELECT id FROM configuracion_parametros LIMIT 1")).fetchone()
        if not conf_exists:
            conn.execute(text("""
                INSERT INTO configuracion_parametros (id, hc_default, enf_hcrenf_default, enf_haplmed_default, hora_restablecimiento, auto_restablecer, tipos_habilitados, updated_at)
                VALUES (1, 30, 48, 48, '20:05', true, '["Historia Clinica", "Enfermeria", "Otros"]'::json, NOW())
            """))

        conn.execute(text("ALTER TABLE boletines ADD COLUMN IF NOT EXISTS mes INTEGER"))
        conn.execute(text("ALTER TABLE boletines ADD COLUMN IF NOT EXISTS anio INTEGER"))
        conn.execute(text("UPDATE boletines SET mes = EXTRACT(MONTH FROM COALESCE(fecha, fecha_registro, NOW())) WHERE mes IS NULL"))
        conn.execute(text("UPDATE boletines SET anio = EXTRACT(YEAR FROM COALESCE(fecha, fecha_registro, NOW())) WHERE anio IS NULL"))
        conn.execute(text("ALTER TABLE boletines ALTER COLUMN mes SET NOT NULL"))
        conn.execute(text("ALTER TABLE boletines ALTER COLUMN anio SET NOT NULL"))

        # RegVersion new columns
        conn.execute(text("ALTER TABLE regversion ADD COLUMN IF NOT EXISTS contenedor_bd VARCHAR(50)"))
        conn.execute(text("ALTER TABLE regversion ADD COLUMN IF NOT EXISTS num_compilacion VARCHAR(100)"))
        conn.execute(text("ALTER TABLE regversion ADD COLUMN IF NOT EXISTS fecha_compilacion TIMESTAMP"))

        # Ensure configuracion_version_correos table exists via Base.metadata.create_all already, but also ensure default row
        try:
            conf_v_exists = conn.execute(text("SELECT id FROM configuracion_version_correos LIMIT 1")).fetchone()
            if not conf_v_exists:
                conn.execute(text("INSERT INTO configuracion_version_correos (id, correos_pruebas, correos_produccion, updated_at) VALUES (1, '', '', NOW())"))
        except Exception:
            pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(settings.UPLOAD_FOLDER, exist_ok=True)
    logger.info("Directorio de subidas verificado o creado: %s", settings.UPLOAD_FOLDER)
    
    # Iniciar scheduler
    scheduler = init_scheduler()

    try:
        initialize_database()
    except Exception as exc:
        logger.exception("Error inicializando la base de datos")
        raise RuntimeError("No se pudo inicializar la base de datos") from exc
    
    yield
    
    # Detener scheduler al apagar
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler detenido.")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan
)

# Audit logging middleware
app.add_middleware(AuditMiddleware)

# Ensure upload directory exists and expose it via static path
upload_dir = ensure_upload_dir()
app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")

# Configure CORS to allow frontend calls
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual domain(s)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(versions.router, prefix="/api/v1")
app.include_router(observaciones.router, prefix="/api/v1")
app.include_router(boletines.router, prefix="/api/v1")
app.include_router(manuales.router, prefix="/api/v1")
app.include_router(solicitud_parametro.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(parametros_clinicos.router, prefix="/api/v1")
app.include_router(auditoria.router, prefix="/api/v1")


@app.get("/")
def home():
    return {
        "application": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }


@app.get("/db-test")
def db_test():
    db = SessionLocal()
    try:
        version = db.execute(
            text("select version();")
        ).scalar()
        return {
            "database": version
        }
    finally:
        db.close()