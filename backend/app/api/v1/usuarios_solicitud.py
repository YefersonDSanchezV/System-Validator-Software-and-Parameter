from datetime import datetime
from typing import List, Optional
import logging
import os
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, get_password_hash, verify_password, get_current_usuario_solicitud, bearer_scheme
from app.models.usuarios_solicitud import UsuarioSolicitud, UsuarioSolicitudPlataforma
from app.models.solicitud_usuario import PlataformaSolicitudAcceso
from app.utils.file_storage import save_upload_file
from jose import JWTError, jwt
from fastapi.security import HTTPAuthorizationCredentials

router = APIRouter(tags=["Usuarios Solicitud"])
logger = logging.getLogger(__name__)

IMAGE_TYPES = {"image/jpeg", "image/png"}


def signature(file: UploadFile) -> None:
    if file.content_type not in IMAGE_TYPES or Path(file.filename or "").suffix.lower() not in {".jpg", ".jpeg", ".png"}:
        raise HTTPException(422, "La firma debe estar en formato JPG o PNG.")


class UsuarioSolicitudDTO(BaseModel):
    id: int
    nombre_completo: str
    nombre_usuario: str
    correo_institucional: str
    cargo: str
    estado: str
    firma_url: str
    created_at: datetime
    plataformas: List[int] = []

    class Config:
        from_attributes = True


class UsuarioCreateResponse(UsuarioSolicitudDTO):
    pass


class LoginRequest(BaseModel):
    identificador: Optional[str] = None  # correo_institucional o nombre_usuario
    nombre_usuario: Optional[str] = None
    correo: Optional[str] = None
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: UsuarioSolicitudDTO


class ResetPasswordRequest(BaseModel):
    password: str


def to_dto(user: UsuarioSolicitud, db: Session) -> UsuarioSolicitudDTO:
    p_ids = [p.plataforma_id for p in user.plataformas] if user.plataformas else []
    # if lazy load fails, query
    if not p_ids and user.id:
        rows = db.query(UsuarioSolicitudPlataforma.plataforma_id).filter(UsuarioSolicitudPlataforma.usuario_id == user.id).all()
        p_ids = [r[0] for r in rows]
    return UsuarioSolicitudDTO(
        id=user.id,
        nombre_completo=user.nombre_completo,
        nombre_usuario=user.nombre_usuario,
        correo_institucional=user.correo_institucional,
        cargo=user.cargo,
        estado=user.estado,
        firma_url=user.firma_url,
        created_at=user.created_at,
        plataformas=p_ids,
    )


@router.get("/usuarios-solicitud", response_model=List[UsuarioSolicitudDTO])
def list_usuarios(db: Session = Depends(get_db)):
    users = db.query(UsuarioSolicitud).order_by(UsuarioSolicitud.id.desc()).all()
    return [to_dto(u, db) for u in users]


@router.get("/usuarios-solicitud/{uid}", response_model=UsuarioSolicitudDTO)
def get_usuario(uid: int, db: Session = Depends(get_db)):
    user = db.get(UsuarioSolicitud, uid)
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    return to_dto(user, db)


@router.post("/usuarios-solicitud", response_model=UsuarioSolicitudDTO, status_code=201)
async def create_usuario(
    nombre_completo: str = Form(...),
    correo_institucional: str = Form(...),
    cargo: str = Form(...),
    nombre_usuario: str = Form(None),
    password: str = Form(...),
    firma: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    nombre_completo = nombre_completo.strip()
    correo_institucional = correo_institucional.strip().lower()
    cargo = cargo.strip()
    password = password.strip()
    if not nombre_completo or not correo_institucional or not cargo or not password:
        raise HTTPException(422, "Todos los campos son obligatorios")
    if len(password) < 8:
        raise HTTPException(422, "La contraseña debe tener al menos 8 caracteres")
    if "@" not in correo_institucional:
        raise HTTPException(422, "Correo institucional no válido")
    signature(firma)

    # auto generar nombre_usuario si no viene
    if not nombre_usuario or not nombre_usuario.strip():
        base = correo_institucional.split("@")[0].replace(".", "_")
        nombre_usuario = base
        # asegurar único
        suffix = 0
        original = nombre_usuario
        while db.query(UsuarioSolicitud).filter(UsuarioSolicitud.nombre_usuario == nombre_usuario).first():
            suffix += 1
            nombre_usuario = f"{original}{suffix}"
    else:
        nombre_usuario = nombre_usuario.strip()
        if db.query(UsuarioSolicitud).filter(UsuarioSolicitud.nombre_usuario == nombre_usuario).first():
            raise HTTPException(422, "Nombre de usuario ya existe")

    if db.query(UsuarioSolicitud).filter(UsuarioSolicitud.correo_institucional == correo_institucional).first():
        raise HTTPException(422, "Correo institucional ya registrado")

    firma_url = await save_upload_file(firma)
    user = UsuarioSolicitud(
        nombre_completo=nombre_completo,
        nombre_usuario=nombre_usuario,
        correo_institucional=correo_institucional,
        cargo=cargo,
        password_hash=get_password_hash(password),
        firma_url=firma_url,
        estado="Activo",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return to_dto(user, db)


@router.put("/usuarios-solicitud/{uid}", response_model=UsuarioSolicitudDTO)
async def update_usuario(
    uid: int,
    nombre_completo: str = Form(None),
    correo_institucional: str = Form(None),
    cargo: str = Form(None),
    nombre_usuario: str = Form(None),
    firma: UploadFile = File(None),
    db: Session = Depends(get_db),
):
    user = db.get(UsuarioSolicitud, uid)
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    if nombre_completo is not None and nombre_completo.strip():
        user.nombre_completo = nombre_completo.strip()
    if correo_institucional is not None and correo_institucional.strip():
        new_mail = correo_institucional.strip().lower()
        if "@" not in new_mail:
            raise HTTPException(422, "Correo inválido")
        exists = db.query(UsuarioSolicitud).filter(UsuarioSolicitud.correo_institucional == new_mail, UsuarioSolicitud.id != uid).first()
        if exists:
            raise HTTPException(422, "Correo ya registrado por otro usuario")
        user.correo_institucional = new_mail
    if cargo is not None and cargo.strip():
        user.cargo = cargo.strip()
    if nombre_usuario is not None and nombre_usuario.strip():
        new_un = nombre_usuario.strip()
        exists = db.query(UsuarioSolicitud).filter(UsuarioSolicitud.nombre_usuario == new_un, UsuarioSolicitud.id != uid).first()
        if exists:
            raise HTTPException(422, "Nombre de usuario ya existe")
        user.nombre_usuario = new_un
    if firma is not None and firma.filename:
        signature(firma)
        user.firma_url = await save_upload_file(firma)
    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    return to_dto(user, db)


@router.patch("/usuarios-solicitud/{uid}/estado", response_model=UsuarioSolicitudDTO)
def toggle_estado(uid: int, db: Session = Depends(get_db)):
    user = db.get(UsuarioSolicitud, uid)
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    user.estado = "Inactivo" if user.estado == "Activo" else "Activo"
    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    return to_dto(user, db)


@router.post("/usuarios-solicitud/{uid}/reset-password")
def reset_password(uid: int, data: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.get(UsuarioSolicitud, uid)
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    if len(data.password) < 8:
        raise HTTPException(422, "Contraseña mínimo 8 caracteres")
    user.password_hash = get_password_hash(data.password)
    user.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Contraseña restablecida correctamente"}


@router.get("/usuarios-solicitud/{uid}/permisos-plataformas")
def get_permisos(uid: int, db: Session = Depends(get_db)):
    user = db.get(UsuarioSolicitud, uid)
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    # plataformas activas de modulo creacion_usuario
    all_plats = db.query(PlataformaSolicitudAcceso).filter(PlataformaSolicitudAcceso.modulo == "creacion_usuario").all()
    assigned = set(p.plataforma_id for p in user.plataformas)
    return {
        "usuario_id": uid,
        "plataformas": [
            {"oid": p.oid, "nombre": p.nombre, "activa": p.activa, "asignada": p.oid in assigned}
            for p in all_plats
        ],
        "asignadas": list(assigned),
    }


class PermisosUpdate(BaseModel):
    plataforma_ids: List[int]


@router.put("/usuarios-solicitud/{uid}/permisos-plataformas")
def update_permisos(uid: int, data: PermisosUpdate, db: Session = Depends(get_db)):
    user = db.get(UsuarioSolicitud, uid)
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    # validar que plataformas existan y sean de creacion_usuario
    valid_ids = set(p.oid for p in db.query(PlataformaSolicitudAcceso).filter(PlataformaSolicitudAcceso.modulo == "creacion_usuario").all())
    for pid in data.plataforma_ids:
        if pid not in valid_ids:
            raise HTTPException(422, f"Plataforma {pid} no válida para creación de usuario")
    # replace
    db.query(UsuarioSolicitudPlataforma).filter(UsuarioSolicitudPlataforma.usuario_id == uid).delete()
    for pid in set(data.plataforma_ids):
        db.add(UsuarioSolicitudPlataforma(usuario_id=uid, plataforma_id=pid))
    db.commit()
    return {"message": "Permisos actualizados", "plataforma_ids": list(set(data.plataforma_ids))}


# Auth para usuarios_solicitud

@router.post("/auth/usuarios-solicitud/login", response_model=LoginResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    ident = (data.identificador or data.nombre_usuario or data.correo or "").strip().lower()
    if not ident:
        raise HTTPException(status_code=422, detail="Debe ingresar usuario o correo institucional")
    # buscar por correo o nombre_usuario
    user = db.query(UsuarioSolicitud).filter(
        (UsuarioSolicitud.correo_institucional == ident) | (UsuarioSolicitud.nombre_usuario == ident)
    ).first()
    if not user:
        # try case insensitive for nombre_usuario
        user = db.query(UsuarioSolicitud).filter(UsuarioSolicitud.correo_institucional.ilike(ident)).first()
        if not user:
            user = db.query(UsuarioSolicitud).filter(UsuarioSolicitud.nombre_usuario.ilike(ident)).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    if user.estado != "Activo":
        raise HTTPException(status_code=403, detail="Usuario inactivo")
    token = create_access_token({"sub": user.nombre_usuario, "uid": str(user.id), "mail": user.correo_institucional})
    return LoginResponse(access_token=token, usuario=to_dto(user, db))


@router.get("/auth/usuarios-solicitud/me", response_model=UsuarioSolicitudDTO)
def me(current=Depends(get_current_usuario_solicitud), db: Session = Depends(get_db)):
    # current ya es UsuarioSolicitud
    return to_dto(current, db)


@router.get("/auth/usuarios-solicitud/me/permisos")
def my_permisos(current=Depends(get_current_usuario_solicitud), db: Session = Depends(get_db)):
    # retorna nombres de plataformas permitidas
    allowed_ids = [p.plataforma_id for p in current.plataformas]
    if not allowed_ids:
        rows = db.query(UsuarioSolicitudPlataforma.plataforma_id).filter(UsuarioSolicitudPlataforma.usuario_id == current.id).all()
        allowed_ids = [r[0] for r in rows]
    plats = db.query(PlataformaSolicitudAcceso).filter(PlataformaSolicitudAcceso.oid.in_(allowed_ids)).all() if allowed_ids else []
    return {"usuario_id": current.id, "plataformas": [p.nombre for p in plats], "ids": allowed_ids}
