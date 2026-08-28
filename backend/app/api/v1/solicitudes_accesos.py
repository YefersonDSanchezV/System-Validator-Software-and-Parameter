from datetime import datetime
import html, json
from pathlib import Path
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.models.solicitud_password import SolicitudRestablecimientoPassword
from app.models.solicitud_usuario import ConfiguracionSolicitudesAcceso, PlataformaSolicitudAcceso, SolicitudCreacionUsuario
from app.schemas.solicitud_accesos import ConfiguracionSolicitudesAccesoDTO, EditarNombreUsuarioDTO, PlataformaSolicitudAccesoDTO, RestablecimientoCorreoDTO, SolicitudCreacionUsuarioResponse, SolicitudRestablecimientoPasswordCreate, SolicitudRestablecimientoPasswordResponse, UsuarioCreadoCorreoDTO
from app.utils.file_storage import save_upload_file
from app.utils.mailer import MailerConfig, build_signature_html, send_email

router = APIRouter(prefix="/solicitudes-accesos", tags=["Solicitudes de accesos"])
IMAGE_TYPES = {"image/jpeg", "image/png"}

def required(name, value):
    value = value.strip()
    if not value: raise HTTPException(422, f"{name} es obligatorio.")
    return value
def next_id(db, model, prefix):
    base = f"{prefix}-{datetime.now():%Y%m}-"
    last = db.query(model.consecutivo).filter(model.consecutivo.like(f"{base}%")).order_by(model.oid.desc()).first()
    try: number = int(last[0].rsplit("-", 1)[1]) + 1 if last and last[0] else 1
    except (IndexError, ValueError): number = 1
    return f"{base}{number:03d}"
def recipients(value): return [x.strip() for x in value.replace(";", ",").split(",") if x.strip()]
def signature(file):
    if file.content_type not in IMAGE_TYPES or Path(file.filename or "").suffix.lower() not in {".jpg", ".jpeg", ".png"}: raise HTTPException(422, "La firma debe estar en formato JPG o PNG.")
def mail_config():
    return MailerConfig(settings.ACCESS_REQUEST_SMTP_HOST or settings.SMTP_HOST, settings.ACCESS_REQUEST_SMTP_PORT or settings.SMTP_PORT, settings.ACCESS_REQUEST_SMTP_USER or settings.SMTP_USER, settings.ACCESS_REQUEST_SMTP_PASSWORD or settings.SMTP_PASSWORD, settings.ACCESS_REQUEST_SMTP_FROM or settings.SMTP_FROM, settings.SMTP_USE_TLS, settings.SMTP_USE_SSL)
def active(db, module): return {x.nombre for x in db.query(PlataformaSolicitudAcceso).filter(PlataformaSolicitudAcceso.modulo == module, PlataformaSolicitudAcceso.activa.is_(True)).all()}
def email_html(title, rows):
    content = "".join(f"<tr><td style='padding:7px;background:#f8f9fa;font-weight:bold'>{html.escape(a)}</td><td style='padding:7px'>{html.escape(b)}</td></tr>" for a,b in rows)
    return f"<div style='font-family:Segoe UI,Arial;border:1px solid #ddd'><div style='padding:18px;background:#1a5276;color:#fff'><h2>{html.escape(title)}</h2></div><div style='padding:18px'><table style='width:100%;border-collapse:collapse'>{content}</table>{build_signature_html()}</div></div>"

@router.get("/plataformas", response_model=list[PlataformaSolicitudAccesoDTO])
def list_platforms(modulo: str | None = None, solo_activas: bool = False, db: Session = Depends(get_db)):
    q = db.query(PlataformaSolicitudAcceso)
    if modulo: q = q.filter(PlataformaSolicitudAcceso.modulo == modulo)
    if solo_activas: q = q.filter(PlataformaSolicitudAcceso.activa.is_(True))
    return q.order_by(PlataformaSolicitudAcceso.modulo, PlataformaSolicitudAcceso.nombre).all()
@router.post("/plataformas", response_model=PlataformaSolicitudAccesoDTO, status_code=201)
def add_platform(data: PlataformaSolicitudAccesoDTO, db: Session = Depends(get_db)):
    if data.modulo not in {"creacion_usuario", "restablecimiento_password"}: raise HTTPException(422, "Módulo no válido.")
    item = PlataformaSolicitudAcceso(nombre=required("Nombre", data.nombre), modulo=data.modulo, activa=data.activa); db.add(item); db.commit(); db.refresh(item); return item
@router.put("/plataformas/{oid}", response_model=PlataformaSolicitudAccesoDTO)
def update_platform(oid: int, data: PlataformaSolicitudAccesoDTO, db: Session = Depends(get_db)):
    item = db.get(PlataformaSolicitudAcceso, oid)
    if not item: raise HTTPException(404, "Plataforma no encontrada.")
    item.nombre = required("Nombre", data.nombre); item.activa = data.activa; db.commit(); db.refresh(item); return item
@router.get("/configuracion", response_model=ConfiguracionSolicitudesAccesoDTO)
def get_config(db: Session = Depends(get_db)): return db.query(ConfiguracionSolicitudesAcceso).first() or ConfiguracionSolicitudesAccesoDTO()
@router.put("/configuracion", response_model=ConfiguracionSolicitudesAccesoDTO)
def put_config(data: ConfiguracionSolicitudesAccesoDTO, db: Session = Depends(get_db)):
    item = db.query(ConfiguracionSolicitudesAcceso).first() or ConfiguracionSolicitudesAcceso(id=1)
    item.correos_creacion, item.correos_restablecimiento = data.correos_creacion.strip(), data.correos_restablecimiento.strip(); db.add(item); db.commit(); db.refresh(item); return item

@router.get("/creacion-usuarios", response_model=list[SolicitudCreacionUsuarioResponse])
def users(db: Session = Depends(get_db)): return db.query(SolicitudCreacionUsuario).order_by(SolicitudCreacionUsuario.oid.desc()).all()
@router.post("/creacion-usuarios", response_model=SolicitudCreacionUsuarioResponse, status_code=201)
async def create_user(tipos: str = Form(...), solicitante: str = Form(...), area: str = Form(...), primer_nombre: str = Form(...), segundo_nombre: str | None = Form(None), primer_apellido: str = Form(...), segundo_apellido: str = Form(...), cedula: str = Form(...), telefono: str = Form(...), correo: str = Form(...), direccion: str = Form(...), cargo: str = Form(...), nombre_usuario: str = Form(...), firma: UploadFile = File(...), db: Session = Depends(get_db)):
    try: selected = list(dict.fromkeys(json.loads(tipos)))
    except (TypeError, json.JSONDecodeError): raise HTTPException(422, "Debe seleccionar uno o más tipos.")
    if not selected or not set(selected).issubset(active(db, "creacion_usuario")): raise HTTPException(422, "Uno o más tipos están inactivos o no son válidos.")
    signature(firma)
    item = SolicitudCreacionUsuario(consecutivo=next_id(db, SolicitudCreacionUsuario, "USR"), tipo=selected[0], tipos=selected, solicitante=required("Solicitante", solicitante), area=required("Área", area), primer_nombre=required("Primer nombre", primer_nombre), segundo_nombre=segundo_nombre.strip() if segundo_nombre else None, primer_apellido=required("Primer apellido", primer_apellido), segundo_apellido=required("Segundo apellido", segundo_apellido), cedula=required("Cédula", cedula), telefono=required("Teléfono", telefono), correo=required("Correo", correo), direccion=required("Dirección", direccion), cargo=required("Cargo", cargo), nombre_usuario=required("Nombre de usuario", nombre_usuario), firma_url=await save_upload_file(firma), estado="Pendiente", fecha_registro=datetime.utcnow())
    db.add(item); db.commit(); db.refresh(item)
    conf = db.query(ConfiguracionSolicitudesAcceso).first()
    try: send_email(f"Nueva solicitud de creación ({item.consecutivo})", email_html("Nueva solicitud de creación de usuario", [("Consecutivo",item.consecutivo),("Tipos",", ".join(selected)),("Solicitante",item.solicitante),("Área",item.area)]), recipients(conf.correos_creacion if conf else ""), True, mail_config())
    except Exception: pass
    return item
@router.put("/creacion-usuarios/{oid}/nombre-usuario", response_model=SolicitudCreacionUsuarioResponse)
def edit_username(oid: int, data: EditarNombreUsuarioDTO, db: Session = Depends(get_db)):
    item = db.get(SolicitudCreacionUsuario, oid)
    if not item: raise HTTPException(404, "Solicitud no encontrada.")
    item.nombre_usuario = required("Nombre de usuario",data.nombre_usuario); db.commit(); db.refresh(item); return item
@router.post("/creacion-usuarios/{oid}/usuario-creado")
async def user_created(oid: int, payload: str = Form(...), firma: UploadFile = File(...), db: Session = Depends(get_db)):
    item = db.get(SolicitudCreacionUsuario, oid)
    if not item: raise HTTPException(404, "Solicitud no encontrada.")
    signature(firma)
    try: data = UsuarioCreadoCorreoDTO.model_validate_json(payload)
    except Exception: raise HTTPException(422, "Datos de correo no válidos.")
    types = item.tipos or [item.tipo]
    if len(data.accesos) != len(types) or any(not x.get("nombre_usuario","").strip() or not x.get("password","").strip() for x in data.accesos): raise HTTPException(422, "Informe usuario y contraseña para cada tipo.")
    to = recipients(data.destinatarios)
    if not to: raise HTTPException(422, "Indique al menos un destinatario.")
    item.firma_cierre_url = await save_upload_file(firma)
    rows=[("Consecutivo",item.consecutivo),("Funcionario",f"{item.primer_nombre} {item.primer_apellido}"),("Observación",data.observacion)]+[(f"Acceso {types[i]}",f"Usuario: {x['nombre_usuario']} | Contraseña: {x['password']}") for i,x in enumerate(data.accesos)]
    send_email(f"Usuarios creados ({item.consecutivo})",email_html("Usuarios creados",rows),to,True,mail_config()); item.estado="Usuario creado"; db.commit(); return {"message":"Correo enviado correctamente."}

@router.get("/restablecimientos-password", response_model=list[SolicitudRestablecimientoPasswordResponse])
def passwords(db: Session = Depends(get_db)): return db.query(SolicitudRestablecimientoPassword).order_by(SolicitudRestablecimientoPassword.oid.desc()).all()
@router.post("/restablecimientos-password", response_model=SolicitudRestablecimientoPasswordResponse, status_code=201)
def reset_request(data: SolicitudRestablecimientoPasswordCreate, db: Session = Depends(get_db)):
    if data.plataforma not in active(db,"restablecimiento_password"): raise HTTPException(422,"La plataforma no es válida o está inactiva.")
    item=SolicitudRestablecimientoPassword(consecutivo=next_id(db,SolicitudRestablecimientoPassword,"RST"),plataforma=data.plataforma,solicitante=required("Solicitante",data.solicitante),area=required("Área",data.area),usuario=required("Usuario",data.usuario),observacion=required("Observación",data.observacion),correo_jefe=required("Correo del jefe",data.correo_jefe),estado="Pendiente",fecha_registro=datetime.utcnow()); db.add(item); db.commit(); db.refresh(item); return item
@router.post("/restablecimientos-password/{oid}/notificar")
async def notify_reset(oid: int, payload: str = Form(...), firma: UploadFile = File(...), db: Session = Depends(get_db)):
    item=db.get(SolicitudRestablecimientoPassword,oid)
    if not item: raise HTTPException(404,"Solicitud no encontrada.")
    signature(firma)
    try: data=RestablecimientoCorreoDTO.model_validate_json(payload)
    except Exception: raise HTTPException(422,"Datos de correo no válidos.")
    to=recipients(data.destinatarios)
    if not to: raise HTTPException(422,"Indique al menos un destinatario.")
    item.firma_cierre_url=await save_upload_file(firma); send_email(f"Contraseña restablecida ({item.consecutivo})",email_html("Restablecimiento de contraseña realizado",[("Consecutivo",item.consecutivo),("Plataforma",item.plataforma),("Usuario",item.usuario),("Observación",data.observacion)]),to,True,mail_config()); item.estado="Restablecido"; db.commit(); return {"message":"Correo enviado correctamente."}
