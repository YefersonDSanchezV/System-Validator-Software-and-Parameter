from datetime import datetime
import html
import json
import logging
import os
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.solicitud_password import SolicitudRestablecimientoPassword
from app.models.solicitud_usuario import (
    ConfiguracionSolicitudesAcceso,
    PlataformaSolicitudAcceso,
    SolicitudCreacionUsuario,
)
from app.schemas.solicitud_accesos import (
    ConfiguracionSolicitudesAccesoDTO,
    EditarNombreUsuarioDTO,
    PlataformaSolicitudAccesoDTO,
    RestablecimientoCorreoDTO,
    SolicitudCreacionUsuarioResponse,
    SolicitudRestablecimientoPasswordCreate,
    SolicitudRestablecimientoPasswordResponse,
    UsuarioCreadoCorreoDTO,
)
from app.utils.file_storage import ensure_upload_dir, save_upload_file
from app.utils.mailer import MailerConfig, build_signature_html, send_email
from app.core.security import get_optional_usuario_solicitud

router = APIRouter(prefix="/solicitudes-accesos", tags=["Solicitudes de accesos"])
logger = logging.getLogger(__name__)

IMAGE_TYPES = {"image/jpeg", "image/png"}


def required(name: str, value: str) -> str:
    value = value.strip()
    if not value:
        raise HTTPException(422, f"{name} es obligatorio.")
    return value


def next_id(db: Session, model, prefix: str) -> str:
    base = f"{prefix}-{datetime.now():%Y%m}-"
    last = (
        db.query(model.consecutivo)
        .filter(model.consecutivo.isnot(None), model.consecutivo != "")
        .order_by(model.oid.desc())
        .first()
    )
    try:
        number = int(last[0].rsplit("-", 1)[1]) + 1 if last and last[0] else 1
    except (IndexError, ValueError):
        number = 1
    return f"{base}{number:03d}"


def recipients(value: str | None) -> list[str]:
    if not value:
        return []
    return [x.strip() for x in value.replace(";", ",").split(",") if x.strip()]


def signature(file: UploadFile) -> None:
    if file.content_type not in IMAGE_TYPES or Path(file.filename or "").suffix.lower() not in {
        ".jpg",
        ".jpeg",
        ".png",
    }:
        raise HTTPException(422, "La firma debe estar en formato JPG o PNG.")


def mail_config() -> MailerConfig:
    return MailerConfig(
        settings.ACCESS_REQUEST_SMTP_HOST or settings.SMTP_HOST,
        settings.ACCESS_REQUEST_SMTP_PORT or settings.SMTP_PORT,
        settings.ACCESS_REQUEST_SMTP_USER or settings.SMTP_USER,
        settings.ACCESS_REQUEST_SMTP_PASSWORD or settings.SMTP_PASSWORD,
        settings.ACCESS_REQUEST_SMTP_FROM or settings.SMTP_FROM,
        settings.SMTP_USE_TLS,
        settings.SMTP_USE_SSL,
    )


def active(db: Session, module: str) -> set[str]:
    return {
        x.nombre
        for x in db.query(PlataformaSolicitudAcceso)
        .filter(
            PlataformaSolicitudAcceso.modulo == module,
            PlataformaSolicitudAcceso.activa.is_(True),
        )
        .all()
    }


def resolve_upload_path(relative_url: str | None) -> str | None:
    if not relative_url:
        return None
    clean = relative_url.lstrip("/").replace(f"{settings.UPLOAD_FOLDER}/", "", 1)
    filename = os.path.basename(clean)
    abs_path = os.path.join(ensure_upload_dir(), filename)
    return abs_path if os.path.isfile(abs_path) else None


def email_html(title: str, items: list[tuple[str, str]], has_custom_signature: bool = False) -> str:
    rows_html = []
    for item in items:
        if isinstance(item, tuple) and len(item) == 2:
            key, val = item
            if key == "SUBTITLE":
                rows_html.append(
                    f"<tr><td colspan='2' style='padding:12px 10px 6px 10px;background:#ebf5fb;color:#1b4f72;font-weight:bold;font-size:13px;border-top:1px solid #d4efdf;border-bottom:1px solid #d4efdf;'>{html.escape(val)}</td></tr>"
                )
            else:
                rows_html.append(
                    f"<tr><td style='padding:8px 10px;background:#f8f9fa;font-weight:bold;width:38%;border-bottom:1px solid #eee;color:#333;'>{html.escape(str(key))}</td>"
                    f"<td style='padding:8px 10px;border-bottom:1px solid #eee;color:#444;'>{html.escape(str(val))}</td></tr>"
                )

    sig_html = build_signature_html()
    if has_custom_signature:
        sig_html = (
            f"<div style='margin-top:20px;padding-top:15px;border-top:1px dashed #cccccc;'>"
            f"<p style='font-size:11px;color:#7f8c8d;margin-bottom:8px;font-weight:bold;text-transform:uppercase;'>Firma Adjunta de la Solicitud / Notificación:</p>"
            f"<img src='cid:firma_custom' style='max-height:140px;max-width:100%;object-fit:contain;' alt='Firma' />"
            f"</div>"
            + sig_html
        )

    return (
        f"<div style='font-family:Segoe UI,Arial,sans-serif;border:1px solid #d6dbdf;border-radius:8px;max-width:650px;margin:0 auto;overflow:hidden;background:#ffffff;'>"
        f"<div style='padding:18px 24px;background:#1a5276;color:#ffffff;'><h2 style='margin:0;font-size:18px;'>{html.escape(title)}</h2></div>"
        f"<div style='padding:20px;'><table style='width:100%;border-collapse:collapse;font-size:13px;'>{''.join(rows_html)}</table>{sig_html}</div>"
        f"</div>"
    )


@router.get("/plataformas", response_model=list[PlataformaSolicitudAccesoDTO])
def list_platforms(
    modulo: str | None = None, solo_activas: bool = False, db: Session = Depends(get_db)
):
    q = db.query(PlataformaSolicitudAcceso)
    if modulo:
        q = q.filter(PlataformaSolicitudAcceso.modulo == modulo)
    if solo_activas:
        q = q.filter(PlataformaSolicitudAcceso.activa.is_(True))
    return q.order_by(PlataformaSolicitudAcceso.modulo, PlataformaSolicitudAcceso.nombre).all()


@router.post("/plataformas", response_model=PlataformaSolicitudAccesoDTO, status_code=201)
def add_platform(data: PlataformaSolicitudAccesoDTO, db: Session = Depends(get_db)):
    if data.modulo not in {"creacion_usuario", "restablecimiento_password"}:
        raise HTTPException(422, "Módulo no válido.")
    item = PlataformaSolicitudAcceso(
        nombre=required("Nombre", data.nombre), modulo=data.modulo, activa=data.activa
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/plataformas/{oid}", response_model=PlataformaSolicitudAccesoDTO)
def update_platform(oid: int, data: PlataformaSolicitudAccesoDTO, db: Session = Depends(get_db)):
    item = db.get(PlataformaSolicitudAcceso, oid)
    if not item:
        raise HTTPException(404, "Plataforma no encontrada.")
    item.nombre = required("Nombre", data.nombre)
    item.activa = data.activa
    db.commit()
    db.refresh(item)
    return item


@router.delete("/plataformas/{oid}", status_code=204)
def delete_platform(oid: int, db: Session = Depends(get_db)):
    item = db.get(PlataformaSolicitudAcceso, oid)
    if not item:
        raise HTTPException(404, "Plataforma no encontrada.")
    db.delete(item)
    db.commit()
    return None


@router.get("/configuracion", response_model=ConfiguracionSolicitudesAccesoDTO)
def get_config(db: Session = Depends(get_db)):
    return db.query(ConfiguracionSolicitudesAcceso).first() or ConfiguracionSolicitudesAccesoDTO()


@router.put("/configuracion", response_model=ConfiguracionSolicitudesAccesoDTO)
def put_config(data: ConfiguracionSolicitudesAccesoDTO, db: Session = Depends(get_db)):
    item = db.query(ConfiguracionSolicitudesAcceso).first() or ConfiguracionSolicitudesAcceso(id=1)
    item.correos_creacion = data.correos_creacion.strip()
    item.correos_restablecimiento = data.correos_restablecimiento.strip()
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/creacion-usuarios", response_model=list[SolicitudCreacionUsuarioResponse])
def users(db: Session = Depends(get_db)):
    return (
        db.query(SolicitudCreacionUsuario)
        .order_by(SolicitudCreacionUsuario.oid.desc())
        .all()
    )


@router.post("/creacion-usuarios", response_model=SolicitudCreacionUsuarioResponse, status_code=201)
async def create_user(
    tipos: str = Form(...),
    solicitante: str = Form(...),
    area: str = Form(...),
    primer_nombre: str = Form(...),
    segundo_nombre: str | None = Form(None),
    primer_apellido: str = Form(...),
    segundo_apellido: str = Form(...),
    cedula: str = Form(...),
    telefono: str = Form(...),
    correo: str = Form(...),
    direccion: str = Form(...),
    cargo: str = Form(...),
    nombre_usuario: str = Form(...),
    firma: UploadFile = File(...),
    plataforma_otros_nombre: str | None = Form(None),
    db: Session = Depends(get_db),
    current_usuario = Depends(get_optional_usuario_solicitud),
):
    try:
        selected = list(dict.fromkeys(json.loads(tipos)))
    except (TypeError, json.JSONDecodeError):
        raise HTTPException(422, "Debe seleccionar uno o más tipos.")
    if not selected:
        raise HTTPException(422, "Debe seleccionar uno o más tipos.")
    # Validación permisos si viene de usuario_solicitud autenticado
    if current_usuario is not None:
        from app.models.usuarios_solicitud import UsuarioSolicitudPlataforma
        allowed_ids = db.query(UsuarioSolicitudPlataforma.plataforma_id).filter(UsuarioSolicitudPlataforma.usuario_id == current_usuario.id).all()
        allowed_ids = [r[0] for r in allowed_ids]
        allowed_names = set()
        if allowed_ids:
            allowed_names = {p.nombre for p in db.query(PlataformaSolicitudAcceso).filter(PlataformaSolicitudAcceso.oid.in_(allowed_ids)).all()}
            allowed_names.add("Otros")
        else:
            # si no tiene permisos asignados, no puede crear nada
            raise HTTPException(403, "No tiene permisos para crear usuarios en ninguna plataforma")
        invalid = [t for t in selected if t not in allowed_names]
        if invalid:
            raise HTTPException(403, f"No tiene permiso para la plataforma: {', '.join(invalid)}")
    # validar que tipos sean activos o Otros
    active_names = active(db, "creacion_usuario")
    for t in selected:
        if t == "Otros":
            continue
        if t not in active_names:
            raise HTTPException(422, f"Plataforma '{t}' inactiva o no válida")
    otros_nombre = (plataforma_otros_nombre or "").strip()
    if "Otros" in selected and not otros_nombre:
        raise HTTPException(422, "Debe indicar el nombre de la plataforma para 'Otros'")
    if "Otros" not in selected and otros_nombre:
        otros_nombre = ""  # ignorar si no selecciona Otros
    signature(firma)

    item = SolicitudCreacionUsuario(
        consecutivo=next_id(db, SolicitudCreacionUsuario, "USR"),
        tipo=selected[0],
        tipos=selected,
        solicitante=required("Solicitante", solicitante),
        area=required("Área", area),
        primer_nombre=required("Primer nombre", primer_nombre),
        segundo_nombre=segundo_nombre.strip() if segundo_nombre else None,
        primer_apellido=required("Primer apellido", primer_apellido),
        segundo_apellido=required("Segundo apellido", segundo_apellido),
        cedula=required("Cédula", cedula),
        telefono=required("Teléfono", telefono),
        correo=required("Correo", correo),
        direccion=required("Dirección", direccion),
        cargo=required("Cargo", cargo),
        nombre_usuario=required("Nombre de usuario", nombre_usuario),
        firma_url=await save_upload_file(firma),
        plataforma_otros_nombre=otros_nombre if otros_nombre else None,
        estado="Pendiente por creación",
        fecha_registro=datetime.utcnow(),
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    conf = db.query(ConfiguracionSolicitudesAcceso).first()
    dest_emails = list(
        dict.fromkeys(
            recipients(conf.correos_creacion if conf else "")
            + ([item.correo.strip()] if item.correo else [])
        )
    )

    full_name = f"{item.primer_nombre} {item.segundo_nombre or ''} {item.primer_apellido} {item.segundo_apellido}".replace("  ", " ").strip()

    email_rows = [
        ("Consecutivo", item.consecutivo),
        ("Solicitante", item.solicitante),
        ("Área", item.area),
        ("SUBTITLE", "Detalles del empleado:"),
        ("Tipos de plataformas", ", ".join(selected)),
        ("Nombre de Usuario", item.nombre_usuario),
        ("Nombre del Funcionario", full_name),
        ("Cédula", item.cedula),
        ("Teléfono", item.telefono),
        ("Dirección", item.direccion),
        ("Correo", item.correo),
        ("Cargo", item.cargo),
        ("Estado", item.estado),
    ]

    custom_sig = resolve_upload_path(item.firma_url)

    if dest_emails:
        try:
            send_email(
                subject=f"Nueva solicitud de creación ({item.consecutivo})",
                body=email_html("Nueva solicitud de creación de usuario", email_rows, has_custom_signature=bool(custom_sig)),
                recipients=dest_emails,
                is_html=True,
                mailer_config=mail_config(),
                custom_signature_path=custom_sig,
            )
        except Exception as e:
            logger.error("Error enviando correo de creación de usuario (%s): %s", item.consecutivo, e, exc_info=True)

    return item


@router.put(
    "/creacion-usuarios/{oid}/nombre-usuario", response_model=SolicitudCreacionUsuarioResponse
)
def edit_username(oid: int, data: EditarNombreUsuarioDTO, db: Session = Depends(get_db)):
    item = db.get(SolicitudCreacionUsuario, oid)
    if not item:
        raise HTTPException(404, "Solicitud no encontrada.")
    item.nombre_usuario = required("Nombre de usuario", data.nombre_usuario)
    db.commit()
    db.refresh(item)
    return item


@router.post("/creacion-usuarios/{oid}/usuario-creado")
async def user_created(
    oid: int,
    payload: str = Form(...),
    firma: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    item = db.get(SolicitudCreacionUsuario, oid)
    if not item:
        raise HTTPException(404, "Solicitud no encontrada.")
    signature(firma)
    try:
        data = UsuarioCreadoCorreoDTO.model_validate_json(payload)
    except Exception as exc:
        logger.error("Error al validar payload JSON en usuario-creado: %s", exc)
        raise HTTPException(422, "Datos de correo no válidos.")

    types = item.tipos or [item.tipo]
    if len(data.accesos) != len(types) or any(
        not str(x.get("nombre_usuario", "")).strip() or not str(x.get("password", "")).strip()
        for x in data.accesos
    ):
        raise HTTPException(422, "Informe usuario y contraseña para cada plataforma.")

    conf = db.query(ConfiguracionSolicitudesAcceso).first()
    form_dest = recipients(data.destinatarios)
    conf_dest = recipients(conf.correos_creacion if conf else "")
    user_dest = [item.correo.strip()] if item.correo else []

    all_to = list(dict.fromkeys(form_dest + conf_dest + user_dest))
    if not all_to:
        raise HTTPException(422, "Indique al menos un destinatario.")

    item.firma_cierre_url = await save_upload_file(firma)
    item.estado = "Usuario creado"

    full_name = f"{item.primer_nombre} {item.segundo_nombre or ''} {item.primer_apellido} {item.segundo_apellido}".replace("  ", " ").strip()

    email_rows = [
        ("Consecutivo", item.consecutivo),
        ("Nombre del Funcionario", full_name),
        ("SUBTITLE", "Credenciales de Acceso por Plataforma:"),
    ]

    for idx, acc in enumerate(data.accesos):
        plat_name = acc.get("tipo") or (types[idx] if idx < len(types) else f"Plataforma {idx+1}")
        user_val = str(acc.get("nombre_usuario", "")).strip()
        pass_val = str(acc.get("password", "")).strip()
        email_rows.append((f"Plataforma ({plat_name})", f"Usuario: {user_val} | Contraseña: {pass_val}"))

    email_rows.append(("Estado", "Usuario creado"))
    if data.observacion and data.observacion.strip():
        email_rows.append(("Observación", data.observacion.strip()))

    custom_sig = resolve_upload_path(item.firma_cierre_url)

    try:
        send_email(
            subject=f"Usuario Creado ({item.consecutivo})",
            body=email_html("Información de Usuarios Creados", email_rows, has_custom_signature=bool(custom_sig)),
            recipients=all_to,
            is_html=True,
            mailer_config=mail_config(),
            custom_signature_path=custom_sig,
        )
    except Exception as exc:
        logger.error("Error enviando correo de usuario creado (%s): %s", item.consecutivo, exc, exc_info=True)
        raise HTTPException(500, f"Error enviando correo electrónico: {exc}")

    db.commit()
    return {"message": "Correo enviado correctamente."}


@router.get(
    "/restablecimientos-password",
    response_model=list[SolicitudRestablecimientoPasswordResponse],
)
def passwords(db: Session = Depends(get_db)):
    return (
        db.query(SolicitudRestablecimientoPassword)
        .order_by(SolicitudRestablecimientoPassword.oid.desc())
        .all()
    )


@router.post(
    "/restablecimientos-password",
    response_model=SolicitudRestablecimientoPasswordResponse,
    status_code=201,
)
def reset_request(
    data: SolicitudRestablecimientoPasswordCreate, db: Session = Depends(get_db)
):
    if data.plataforma not in active(db, "restablecimiento_password"):
        raise HTTPException(422, "La plataforma no es válida o está inactiva.")
    item = SolicitudRestablecimientoPassword(
        consecutivo=next_id(db, SolicitudRestablecimientoPassword, "RST"),
        plataforma=required("Plataforma", data.plataforma),
        solicitante=required("Solicitante", data.solicitante),
        area=required("Área", data.area),
        usuario=required("Usuario", data.usuario),
        observacion=required("Observación", data.observacion),
        correo_jefe=required("Correo del jefe", data.correo_jefe),
        estado="Pendiente por restablecimiento",
        fecha_registro=datetime.utcnow(),
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    conf = db.query(ConfiguracionSolicitudesAcceso).first()
    conf_dest = recipients(conf.correos_restablecimiento if conf else "")
    jefe_dest = [item.correo_jefe.strip()] if item.correo_jefe else []
    all_to = list(dict.fromkeys(conf_dest + jefe_dest))

    if all_to:
        email_rows = [
            ("Consecutivo", item.consecutivo),
            ("Plataforma", item.plataforma),
            ("Solicitante", item.solicitante),
            ("Área", item.area),
            ("Usuario a restablecer", item.usuario),
            ("Correo del jefe directo", item.correo_jefe),
            ("Observación", item.observacion),
            ("Estado", item.estado),
        ]
        try:
            send_email(
                subject=f"Nueva solicitud de restablecimiento de contraseña ({item.consecutivo})",
                body=email_html("Nueva solicitud de restablecimiento de contraseña", email_rows),
                recipients=all_to,
                is_html=True,
                mailer_config=mail_config(),
            )
        except Exception as exc:
            logger.error("Error enviando correo de restablecimiento (%s): %s", item.consecutivo, exc, exc_info=True)

    return item


@router.post("/restablecimientos-password/{oid}/notificar")
async def notify_reset(
    oid: int,
    payload: str = Form(...),
    firma: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    item = db.get(SolicitudRestablecimientoPassword, oid)
    if not item:
        raise HTTPException(404, "Solicitud no encontrada.")
    signature(firma)
    try:
        data = RestablecimientoCorreoDTO.model_validate_json(payload)
    except Exception as exc:
        logger.error("Error al validar JSON en notify_reset: %s", exc)
        raise HTTPException(422, "Datos de correo no válidos.")

    conf = db.query(ConfiguracionSolicitudesAcceso).first()
    form_dest = recipients(data.destinatarios)
    conf_dest = recipients(conf.correos_restablecimiento if conf else "")
    jefe_dest = [item.correo_jefe.strip()] if item.correo_jefe else []

    all_to = list(dict.fromkeys(form_dest + conf_dest + jefe_dest))
    if not all_to:
        raise HTTPException(422, "Indique al menos un destinatario.")

    item.firma_cierre_url = await save_upload_file(firma)
    item.estado = "Restablecido"

    email_rows = [
        ("Consecutivo", item.consecutivo),
        ("Plataforma", item.plataforma),
        ("Solicitante", item.solicitante),
        ("Área", item.area),
        ("Usuario", item.usuario),
        ("Estado", "Restablecido"),
        ("Observación", data.observacion),
    ]

    custom_sig = resolve_upload_path(item.firma_cierre_url)

    try:
        send_email(
            subject=f"Contraseña restablecida ({item.consecutivo})",
            body=email_html("Restablecimiento de contraseña realizado", email_rows, has_custom_signature=bool(custom_sig)),
            recipients=all_to,
            is_html=True,
            mailer_config=mail_config(),
            custom_signature_path=custom_sig,
        )
    except Exception as exc:
        logger.error("Error enviando correo de restablecimiento notificado (%s): %s", item.consecutivo, exc, exc_info=True)
        raise HTTPException(500, f"Error enviando correo electrónico: {exc}")

    db.commit()
    return {"message": "Correo enviado correctamente."}
