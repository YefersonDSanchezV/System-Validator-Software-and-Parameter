from datetime import datetime
import logging
from zoneinfo import ZoneInfo
from sqlalchemy.orm import Session

from app.models.regversion import RegVersion, RestauracionDB, ConfiguracionVersionCorreos, LogCorreoVersion
from app.repositories.version_repositories import VersionRepository
from app.schemas.version import VersionCreate, VersionUpdate, RestauracionDBCreate

logger = logging.getLogger(__name__)


class VersionService:

    def __init__(self):
        self.repository = VersionRepository()

    def listar(self, db: Session):
        return self.repository.get_all(db)

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
        )
        return self.repository.create(db, nueva)

    def actualizar(self, db: Session, oid: int, data: VersionUpdate):
        version = self.obtener(db, oid)
        datos = data.model_dump(exclude_unset=True)

        for key, value in datos.items():
            setattr(version, key, value)

        self.repository.update(db)
        return version

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

        restauracion = RestauracionDB(
            contenedor_bd=data.contenedor_bd,
            fecha_hora_restauracion=datetime.now(),
            fecha_ultima_copia=data.fecha_ultima_copia,
            compilacion_anclada_oid=data.compilacion_anclada_oid,
            compilacion_titulo=comp_titulo,
            usuario=data.usuario or "Coordinador de Sistemas"
        )
        db.add(restauracion)
        db.commit()
        db.refresh(restauracion)
        return restauracion

    def listar_restauraciones(self, db: Session):
        return db.query(RestauracionDB).order_by(RestauracionDB.fecha_hora_restauracion.desc()).all()

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
                            <td style="{estilo_celda_valor}"><a href="{version.enlace}" style="color: #3498db; text-decoration: none; font-weight: bold;">Acceder al enlace</a></td>
                        </tr>
                    </table>

                    <h3 style="margin-bottom: 5px; color: #2c3e50;">Mejoras de esta compilación:</h3>
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

                    <h3 style="margin-bottom: 5px; color: #1a5276;">Detalles de mejora:</h3>
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

        # send email (non-blocking failure)
        try:
            from app.utils.mailer import send_email
            send_email(subject, body, recipients, is_html=True)
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