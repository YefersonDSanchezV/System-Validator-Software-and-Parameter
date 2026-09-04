import json
from datetime import datetime
import logging
from zoneinfo import ZoneInfo
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.regversion import (
    RegVersion, RestauracionDB, ConfiguracionVersionCorreos, LogCorreoVersion, PermisoUsuarioCoordinador
)
from app.repositories.version_repositories import VersionRepository
from app.schemas.version import (
    VersionCreate,
    VersionUpdate,
    RestauracionDBCreate,
    ReporteFirmaFila,
    ReporteFirmasPdfRequest,
)
from app.services.observacion_service import ObservacionService
from app.utils.mailer import MailAttachment, get_version_mailer_config, send_email
from app.utils.pdf_generator import generate_firmas_report_pdf

logger = logging.getLogger(__name__)

ALL_COORDINATOR_SECTIONS = [
    "registro", "restaurarDB", "consultaVersiones", "consultaRestauracionDB", "versionParametros",
    "detalles", "solicitudParametro", "solicitudUsuario", "solicitudPassword", "parametrosConfig",
    "reporteFirmas", "reporteDetalles", "documentos_boletines", "documentos_manuales",
    "solicitudesManuales", "auditoria", "permisos"
]

class VersionService:
    def __init__(self, repository: VersionRepository | None = None):
        self.repository = repository or VersionRepository()
        self.observacion_service = ObservacionService()

    def listar(self, db: Session):
        versions = self.repository.get_all(db)
        if versions and not any(getattr(v, "es_produccion", False) for v in versions):
            target = next((v for v in versions if "21 AGOSTO 2026" in v.titulo.upper()), versions[0])
            target.es_produccion = True
            db.commit()
        return versions

    def obtener(self, db: Session, oid: int):
        version = self.repository.get_by_id(db, oid)
        if version is None:
            raise Exception("Versión no encontrada")
        return version

    def crear(self, db: Session, data: VersionCreate):
        nueva = RegVersion(
            titulo=data.titulo,
            descripcion=data.descripcion,
            enlace=data.enlace,
            usuario=data.usuario,
            estado=True,
            fecha_registro=datetime.now(),
            contenedor_bd=data.contenedor_bd,
            num_compilacion=data.num_compilacion,
            fecha_compilacion=data.fecha_compilacion,
            es_produccion=data.es_produccion or False,
        )
        return self.repository.create(db, nueva)

    def actualizar(self, db: Session, oid: int, data: VersionUpdate):
        version = self.obtener(db, oid)
        datos = data.model_dump(exclude_unset=True)

        for key, value in datos.items():
            setattr(version, key, value)

        self.repository.update(db)
        return version

    def set_produccion(self, db: Session, oid: int):
        target = self.obtener(db, oid)
        db.query(RegVersion).update({RegVersion.es_produccion: False})
        target.es_produccion = True
        db.commit()
        db.refresh(target)
        return target

    def eliminar(self, db: Session, oid: int):
        version = self.obtener(db, oid)
        self.repository.delete(db, version)

    # DB Restoration helpers
    def crear_restauracion(self, db: Session, data: RestauracionDBCreate):
        comp_titulo = None
        if data.compilacion_anclada_oid:
            comp = db.query(RegVersion).filter(RegVersion.oid == data.compilacion_anclada_oid).first()
            if comp:
                comp_titulo = f"{comp.titulo} - {comp.num_compilacion}" if comp.num_compilacion else comp.titulo

        now_bogota = datetime.now(ZoneInfo("America/Bogota")).replace(tzinfo=None)

        # Calculate next contiguous ID
        max_oid = db.query(RestauracionDB.oid).order_by(RestauracionDB.oid.desc()).first()
        next_oid = (max_oid[0] + 1) if max_oid and max_oid[0] is not None else 1

        restauracion = RestauracionDB(
            oid=next_oid,
            contenedor_bd=data.contenedor_bd,
            fecha_hora_restauracion=now_bogota,
            fecha_ultima_copia=data.fecha_ultima_copia,
            compilacion_anclada_oid=data.compilacion_anclada_oid,
            compilacion_titulo=comp_titulo,
            usuario=data.usuario or "Coordinador de Sistemas"
        )
        db.add(restauracion)
        db.commit()
        db.refresh(restauracion)

        # Synchronize PostgreSQL sequence
        try:
            db.execute(text("SELECT setval(pg_get_serial_sequence('restauraciones_db', 'oid'), (SELECT COALESCE(MAX(oid), 1) FROM restauraciones_db), true)"))
            db.commit()
        except Exception:
            db.rollback()

        return restauracion

    def eliminar_restauracion(self, db: Session, oid: int):
        restauracion = db.query(RestauracionDB).filter(RestauracionDB.oid == oid).first()
        if not restauracion:
            raise ValueError(f"Restauración #{oid} no encontrada")
        db.delete(restauracion)
        db.commit()

        # Reset sequence in PostgreSQL so next INSERT starts at max(oid)
        try:
            count = db.query(RestauracionDB).count()
            if count == 0:
                db.execute(text("SELECT setval(pg_get_serial_sequence('restauraciones_db', 'oid'), 1, false)"))
            else:
                db.execute(text("SELECT setval(pg_get_serial_sequence('restauraciones_db', 'oid'), (SELECT MAX(oid) FROM restauraciones_db), true)"))
            db.commit()
        except Exception as exc:
            logger.warning("No se pudo reajustar secuencia de restauraciones_db: %s", exc)
            db.rollback()

        return True

    def listar_restauraciones(self, db: Session):
        return db.query(RestauracionDB).order_by(RestauracionDB.fecha_hora_restauracion.desc()).all()

    # --- Permisos Coordinador helpers ---
    def obtener_todos_permisos(self, db: Session):
        usuarios_validos = ["sistemas", "ingeniero", "practicante"]
        resultado = []
        for u in usuarios_validos:
            p = db.query(PermisoUsuarioCoordinador).filter(PermisoUsuarioCoordinador.usuario == u).first()
            if p and p.permisos:
                try:
                    secciones = json.loads(p.permisos)
                except Exception:
                    secciones = ALL_COORDINATOR_SECTIONS
            else:
                secciones = ALL_COORDINATOR_SECTIONS
            resultado.append({"usuario": u, "permisos": secciones})
        return resultado

    def guardar_permisos(self, db: Session, usuario: str, permisos: list[str]):
        u_clean = usuario.strip().lower()
        p = db.query(PermisoUsuarioCoordinador).filter(PermisoUsuarioCoordinador.usuario == u_clean).first()
        perm_json = json.dumps(permisos)
        now_bogota = datetime.now(ZoneInfo("America/Bogota")).replace(tzinfo=None)
        if not p:
            p = PermisoUsuarioCoordinador(usuario=u_clean, permisos=perm_json, updated_at=now_bogota)
            db.add(p)
        else:
            p.permisos = perm_json
            p.updated_at = now_bogota
        db.commit()
        return {"usuario": u_clean, "permisos": permisos}

    # --- Correo version helpers ---
    @staticmethod
    def _obtener_destinatarios_version(db: Session, tipo: str) -> list[str]:
        try:
            conf = db.query(ConfiguracionVersionCorreos).first()
            if not conf:
                return []
            raw = conf.correos_pruebas if tipo == "pruebas" else conf.correos_produccion
            if not raw or not raw.strip():
                return []
            return [e.strip() for e in raw.replace(";", ",").split(",") if e.strip()]
        except Exception as exc:
            logger.warning("Error resolviendo destinatarios version %s: %s", tipo, exc)
            return []

    @staticmethod
    def _formatear_fecha_12h(dt: datetime | None) -> str:
        if not dt:
            return "—"
        try:
            # ensure Bogota tz
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=ZoneInfo("America/Bogota"))
            else:
                dt = dt.astimezone(ZoneInfo("America/Bogota"))
            return dt.strftime("%d/%m/%Y %I:%M %p")
        except Exception:
            return dt.strftime("%d/%m/%Y %I:%M %p") if dt else "—"

    def enviar_correo_version(self, db: Session, oid: int, tipo: str, mejoras: str, fecha_despliegue, usuario: str = "Coordinador de Sistemas"):
        version = self.obtener(db, oid)
        if tipo == "produccion" and not fecha_despliegue:
            raise ValueError("La fecha y hora de despliegue es obligatoria para producción")
        bog = ZoneInfo("America/Bogota")
        now_bog = datetime.now(bog)
        hour = now_bog.hour
        saludo = "Buenos días" if hour < 12 else "Buenas tardes" if hour < 18 else "Buenas noches"
        fecha_envio_str = now_bog.strftime("%d/%m/%Y %I:%M %p")
        fecha_comp_str = self._formatear_fecha_12h(version.fecha_compilacion)
        titulo_comp = f"{version.titulo} - {version.num_compilacion}" if version.num_compilacion else version.titulo
        prefix = "[PRUEBAS]" if tipo == "pruebas" else "[PRODUCCIÓN]"
        subject = f"{prefix} {titulo_comp}"
        estado_str = "Activo" if version.estado else "Inactivo"

        # normalize fecha_despliegue to UTC naive for storage but keep formatting
        fecha_despliegue_str = None
        fecha_despliegue_val = None
        
        if fecha_despliegue:
            # parse may be naive, assume Bogota
            try:
                if fecha_despliegue.tzinfo is None:
                    fecha_despliegue_val = fecha_despliegue.replace(tzinfo=bog)
                else:
                    fecha_despliegue_val = fecha_despliegue.astimezone(bog)
                fecha_despliegue_str = fecha_despliegue_val.strftime("%d/%m/%Y %I:%M %p")
                # store as naive UTC / original
                fecha_despliegue_val = fecha_despliegue_val.replace(tzinfo=None)
            except Exception:
                fecha_despliegue_str = str(fecha_despliegue)
                fecha_despliegue_val = fecha_despliegue

        mejoras_html = mejoras.strip().replace("\n", "<br>")

        estilo_contenedor = "width: 95%; max-width: 1000px; margin: 0 auto; font-family: 'Segoe UI', Arial, sans-serif; color: #333333; line-height: 1.6; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);"
        estilo_header = f"background-color: {'#2c3e50' if tipo == 'pruebas' else '#1a5276'}; padding: 20px; text-align: center; color: #ffffff;"
        estilo_tabla = "width: 100%; border-collapse: collapse; margin: 15px 0;"
        estilo_celda_label = "padding: 8px 12px; background-color: #f8f9fa; font-weight: bold; border-bottom: 1px solid #e9ecef; width: 25%; color: #555555;"
        estilo_celda_valor = "padding: 8px 12px; border-bottom: 1px solid #e9ecef;"
        estilo_alerta = "background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; border-radius: 4px; color: #856404;"
        estilo_bloque_mejoras = "background-color: #f4f6f7; border-left: 4px solid #3498db; padding: 15px; margin: 15px 0; border-radius: 4px; font-family: monospace; white-space: pre-line;"

        # 1. Definir los estilos de los avisos legales
        estilo_eco = "margin-top: 20px; color: #7cb342; font-size: 11px; font-weight: bold; font-family: Arial, sans-serif;"
        estilo_legal = "margin-top: 8px; color: #999999; font-size: 10px; line-height: 1.3; text-align: justify; font-family: Arial, sans-serif;"

        # 2. Construir el bloque HTML de la firma que usará la imagen local
                # --- VARIABLE CORREGIDA: SOLO CARGA LA IMAGEN ---
        html_firma = f"""
        <!-- Contenedor de la Firma con Imagen Local Incrustada -->
        <div style="margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 20px;">
            <img src="cid:firma_institucional" alt="Firma ICVC" style="max-width: 100%; height: auto; display: block;">
        </div>
        """

        # 3. Insertar la firma en los bloques correspondientes
        if tipo == "pruebas":
            body = f"""
            <div style="{estilo_contenedor}">
                <div style="{estilo_header}">
                    <h2 style="margin: 0; font-size: 20px;">Notificación de Compilación (Pruebas)</h2>
                </div>
                <div style="padding: 20px;">
                    <p style="font-size: 16px; font-weight: bold; margin-top: 0; color: #2c3e50;">Asunto: {titulo_comp}</p>
                    <p style="font-size: 13px; color: #555; font-style: italic;">Luego de 7 días de pruebas satisfactorias, la versión se declara estable y se procede con su despliegue en producción.</p>
                    
                    <table style="{estilo_tabla}">
                        <tr>
                            <td style="{estilo_celda_label}">Contenedor BD:</td>
                            <td style="{estilo_celda_valor}">{version.contenedor_bd or '—'}</td>
                        </tr>
                        <tr>
                            <td style="{estilo_celda_label}">Fecha de compilación:</td>
                            <td style="{estilo_celda_valor}">{fecha_comp_str}</td>
                        </tr>
                        <tr>
                            <td style="{estilo_celda_label}">Estado:</td>
                            <td style="{estilo_celda_valor}"><span style="background-color: #d4edda; color: #155724; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">{estado_str}</span></td>
                        </tr>
                        <tr>
                            <td style="{estilo_celda_label}">Enlace:</td>
                            <td style="{estilo_celda_valor}"><a href="http://192.168.150.10:8010/" style="color: #3498db; text-decoration: none; font-weight: bold;">Acceder al enlace</a></td>
                        </tr>
                    </table>

                    <h3 style="margin-bottom: 5px; color: #2c3e50;">Detalles de Compilación:</h3>
                    <div style="{estilo_bloque_mejoras}">{mejoras_html}</div>

                    <!-- SE INYECTA LA FIRMA AL FINAL DE PRUEBAS -->
                    {html_firma}
                </div>
            </div>
            """
        else:
            body = f"""
            <div style="{estilo_contenedor}">
                <div style="{estilo_header}">
                    <h2 style="margin: 0; font-size: 20px;">Despliegue de Versión Estable (Producción)</h2>
                </div>
                <div style="padding: 20px;">
                    <p style="margin-top: 0;">{saludo},</p>
                    <p>Debido a los cambios generados por las resoluciones emitidas y correcciones de errores e inconsistencias, que han impactado diversas funcionalidades del sistema principal, procederemos a realizar el despliegue.</p>
                    
                    <table style="{estilo_tabla}">
                        <tr>
                            <td style="{estilo_celda_label}">Compilación:</td>
                            <td style="{estilo_celda_valor}"><strong>{version.num_compilacion or titulo_comp}</strong></td>
                        </tr>
                        <tr>
                            <td style="{estilo_celda_label}">Fecha Compilación:</td>
                            <td style="{estilo_celda_valor}">{fecha_comp_str}</td>
                        </tr>
                        <tr>
                            <td style="{estilo_celda_label}">Fecha Programada:</td>
                            <td style="{estilo_celda_valor}"><span style="color: #c0392b; font-weight: bold;">{fecha_despliegue_str or '—'}</span></td>
                        </tr>
                    </table>

                    <p style="font-size: 13px; color: #555; font-style: italic;">Esta versión superó un proceso de validación exhaustivo por las diferentes áreas, alcanzando un nivel de confiabilidad del 99% desde su liberación hasta el {fecha_envio_str}. Se define como versión estable para producción.</p>

                    <h3 style="margin-bottom: 5px; color: #1a5276;">Detalles de Compilación:</h3>
                    <div style="{estilo_bloque_mejoras}">{mejoras_html}</div>

                    <div style="{estilo_alerta}">
                        <strong>Aviso Tecnológico:</strong> Incorpora la nueva tecnología de funcionalidad complemento <strong>.NET 8 (SYAC)</strong>. Compilaciones anteriores quedarán sin soporte.
                    </div>

                    <div style="background-color: #eaeded; padding: 12px; border-radius: 4px; font-size: 14px; text-align: center; border: 1px solid #d5dbdb;">
                        ⚠️ El servicio se actualizará en las plataformas WEB y NET de <strong>Dinámica Gerencial</strong>. <br>
                        <strong>Afectación estimada:</strong> 10 a 20 minutos de interrupción.
                    </div>

                    <p style="margin-top: 20px; margin-bottom: 0;">Agradecemos su comprensión y colaboración en la mejora continua.</p>
                    
                    <!-- SE REEMPLAZA EL TEXTO "CORDIALMENTE" ANTERIOR POR LA FIRMA GRÁFICA COMPLETA -->
                    {html_firma}
                </div>
            </div>
            """


        recipients = self._obtener_destinatarios_version(db, tipo)
        if not recipients:
            raise ValueError(f"No hay destinatarios configurados para '{tipo}'. Configurelos en Parámetros -> Consulta de Versión -> Parámetros.")

        attachments: list[MailAttachment] = []
        if tipo == "produccion":
            try:
                now_bogota = datetime.now(ZoneInfo("America/Bogota"))
                observaciones = self.observacion_service.listar_por_version(db, oid)
                # — Replicar lógica idéntica a Reporte de Firmas de Directivos del frontend —
                # MODULOS y labels iguales a frontend/src/config/constants.ts
                MODULOS = [
                    "ADMISIONES","CARTERA","CONTABILIDAD","CONTRATOS_IPS",
                    "FACTURACION","HOSPITALIZACION","INVENTARIOS","PAGOS",
                    "TESORERIA","GENERALES_SEGURIDAD","CITAS_MEDICAS",
                    "HISTORIAS_CLINICAS","ACTIVOS_FIJOS","NOMINA",
                    "INFORMACION_FINANCIERA_NIIF","GESTION_GERENCIAL",
                    "WEB_CITAS_MEDICAS","PROGRAMACION_DE_CIRUGIAS","OTROS",
                ]
                MODULO_LABELS = {
                    "CONTRATOS_IPS": "CONTRATOS IPS",
                    "GENERALES_SEGURIDAD": "GENERALES & SEGURIDAD",
                    "CITAS_MEDICAS": "CITAS MEDICAS",
                    "HISTORIAS_CLINICAS": "HISTORIAS CLINICAS",
                    "ACTIVOS_FIJOS": "ACTIVOS FIJOS",
                    "WEB_CITAS_MEDICAS": "WEB CITAS MEDICAS",
                    "PROGRAMACION_DE_CIRUGIAS": "PROGRAMACION DE CIRUGIAS",
                }
                def _label(m: str) -> str:
                    return MODULO_LABELS.get(m, m)
                # Filas idénticas al frontend: incluir firma base64, observacion, captura, incidencia, ruta
                filas = []
                for item in observaciones:
                    firma_val = item.get("firma")
                    # captura puede ser lista o None (observacion_service retorna list or None)
                    cap = item.get("captura")
                    if isinstance(cap, str):
                        cap = [cap]
                    elif cap is None:
                        cap = None
                    elif isinstance(cap, list):
                        cap = [str(c) for c in cap if c]
                    else:
                        cap = None
                    filas.append(
                        ReporteFirmaFila(
                            nombre=str(item.get("nombre") or "Sin nombre"),
                            cargo=item.get("cargo"),
                            modulo=str(item.get("modulo") or "OTROS"),
                            fecha_hora=str(item.get("fechaHora") or "—"),
                            estado=str(item.get("estado") or "rechazo"),
                            tiene_firma=bool(firma_val),
                            firma=firma_val if isinstance(firma_val, str) else None,
                            observacion=str(item.get("observacion") or ""),
                            incidencia=item.get("incidencia"),
                            ruta=item.get("ruta"),
                            captura=cap,
                        )
                    )
                # Temas: replicar frontend -> lista completa de MODULOS en label + extras
                obs_modulos_raw = {str(f.modulo) for f in filas}
                # Si hay observaciones, usar mismos temas que frontend (todos los módulos + extras)
                if filas:
                    obs_labels = {_label(m) for m in obs_modulos_raw}
                    temas_labels_full = [_label(m) for m in MODULOS]
                    extras = [lbl for lbl in obs_labels if lbl not in temas_labels_full]
                    temas = temas_labels_full + extras
                else:
                    temas = [titulo_comp]
                # hora_fin = +1 hora como hace el frontend
                from datetime import timedelta as _td
                end_bog = now_bogota + _td(hours=1)
                reporte_payload = ReporteFirmasPdfRequest(
                    version_titulo=titulo_comp,
                    version_descripcion=version.descripcion or "Sin descripción",
                    fecha_reunion=now_bogota.strftime("%d/%m/%Y"),
                    hora_inicio=now_bogota.strftime("%H:%M"),
                    hora_fin=end_bog.strftime("%H:%M"),
                    conclusion="Reporte generado automáticamente para soporte del despliegue de producción.",
                    observacion=f"Adjunto automático del acta de firmas para la compilación {titulo_comp}.",
                    temas=temas,
                    filas=filas,
                )
                pdf_bytes = generate_firmas_report_pdf(reporte_payload)
                attachments.append(
                    MailAttachment(
                        filename=f"reporte_firmas_{oid}.pdf",
                        content=pdf_bytes,
                        mime_subtype="pdf",
                    )
                )
            except Exception as exc:
                logger.warning("No se pudo adjuntar el reporte de firmas para versión %s: %s", oid, exc, exc_info=True)

        # send email (non-blocking failure)
        try:
            send_email(
                subject,
                body,
                recipients,
                is_html=True,
                mailer_config=get_version_mailer_config(),
                attachments=attachments,
            )
        except Exception as exc:
            logger.warning("No se pudo enviar correo de versión %s (%s): %s", oid, tipo, exc)
            raise ValueError(f"No se pudo enviar el correo: {exc}") from exc

        # log
        log = LogCorreoVersion(
            version_oid=oid,
            tipo=tipo,
            destinatarios=",".join(recipients),
            asunto=subject,
            mejoras=mejoras.strip(),
            fecha_despliegue=fecha_despliegue_val,
            fecha_envio=datetime.now(),
            usuario=usuario,
        )
        db.add(log)
        db.commit()
        db.refresh(log)
        return {"message": "Correo enviado correctamente", "log_oid": log.oid, "destinatarios": recipients, "asunto": subject}

    def get_config_correos(self, db: Session):
        conf = db.query(ConfiguracionVersionCorreos).first()
        if not conf:
            conf = ConfiguracionVersionCorreos(id=1, correos_pruebas="", correos_produccion="")
            db.add(conf)
            db.commit()
            db.refresh(conf)
        return conf

    def update_config_correos(self, db: Session, correos_pruebas: str, correos_produccion: str):
        conf = db.query(ConfiguracionVersionCorreos).first()
        if not conf:
            conf = ConfiguracionVersionCorreos(id=1)
            db.add(conf)
        conf.correos_pruebas = correos_pruebas or ""
        conf.correos_produccion = correos_produccion or ""
        from datetime import datetime as dt
        conf.updated_at = dt.now()
        db.commit()
        db.refresh(conf)
        return conf

    def listar_logs(self, db: Session, version_oid: int | None = None):
        q = db.query(LogCorreoVersion).order_by(LogCorreoVersion.fecha_envio.desc())
        if version_oid:
            q = q.filter(LogCorreoVersion.version_oid == version_oid)
        return q.all()