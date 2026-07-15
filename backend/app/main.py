from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.models.solicitud_parametro import SolicitudParametro
from app.utils.file_storage import ensure_upload_dir

from app.api.v1 import versions
from app.api.v1 import observaciones
from app.api.v1 import boletines
from app.api.v1 import manuales
from app.api.v1 import admin
from app.api.v1 import solicitud_parametro

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION
)

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

# Create tables if they do not exist yet
Base.metadata.create_all(bind=engine)

# Lightweight schema evolution for existing databases
with engine.begin() as conn:
    conn.execute(text("ALTER TABLE regaprobados ADD COLUMN IF NOT EXISTS cargo VARCHAR(200)"))
    conn.execute(text("ALTER TABLE regrechazado ADD COLUMN IF NOT EXISTS cargo VARCHAR(200)"))
    conn.execute(text("ALTER TABLE solicitud_parametro ADD COLUMN IF NOT EXISTS total_valor INTEGER"))
    conn.execute(text("ALTER TABLE solicitud_parametro ADD COLUMN IF NOT EXISTS total_unidad VARCHAR(20)"))
    conn.execute(text("ALTER TABLE solicitud_parametro ALTER COLUMN fecha_apertura DROP NOT NULL"))
    conn.execute(text("ALTER TABLE solicitud_parametro ALTER COLUMN fecha_cierre DROP NOT NULL"))

# Register routers
app.include_router(versions.router, prefix="/api/v1")
app.include_router(observaciones.router, prefix="/api/v1")
app.include_router(boletines.router, prefix="/api/v1")
app.include_router(manuales.router, prefix="/api/v1")
app.include_router(solicitud_parametro.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")


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