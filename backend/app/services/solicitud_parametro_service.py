from datetime import datetime
import logging
from sqlalchemy.orm import Session
from app.models.solicitud_parametro import SolicitudParametro
from app.repositories.solicitud_parametro_repository import SolicitudParametroRepository
from app.schemas.solicitud_parametro import (
    SolicitudParametroCreate,
    SolicitudHabilitarAction,
    SolicitudRechazarAction,
    SolicitudExtensionAction,
)
from app.utils.mailer import send_email
from app.core.sql_server import (
    update_parametro_historia_clinica,
    update_parametro_enfermeria,
)


NOTIFICATION_RECIPIENTS = [
    #"direccion.medica@icvc.co",
    #"coordinacion.medica@icvc.co",
    #"coordinacion.enfermeria@icvc.co",
    #"coordinacion.consultaexterna@icvc.co",
    #"sistemas@icvc.co",
    #"asistente.ingenieria@icvc.co"
]

logger = logging.getLogger(__name__)

#Estilo para el correo de parametros
estilo_contenedor = "width: 92%; max-width: 760px; margin: 0 auto; font-family: 'Segoe UI', Arial, sans-serif; color: #333333; line-height: 1.6; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);"
estilo_header = "background-color: #1a5276; padding: 20px; text-align: center; color: #ffffff;"
estilo_tabla = "width: 100%; border-collapse: collapse; margin: 15px 0; table-layout: fixed;"
estilo_celda_label = "padding: 4px 10px; background-color: #f8f9fa; font-weight: bold; border-bottom: 1px solid #e9ecef; width: 165px; max-width: 165px; color: #555555; vertical-align: middle; white-space: nowrap; line-height: 1.2;"
estilo_celda_valor = "padding: 4px 10px; border-bottom: 1px solid #e9ecef; word-break: break-word; line-height: 1.2;"


def _get_estado_badge(estado: str) -> str:
    estilos = {
        "habilitado": ("#d4edda", "#155724"),
        "rechazado": ("#f8d7da", "#721c24"),
        "autorizado solicitud previa": ("#e8daef", "#6c3483"),
        "pendiente": ("#fff3cd", "#856404"),
    }
    fondo, color = estilos.get(estado.strip().lower(), ("#e9ecef", "#495057"))
    return (
        f'<span style="display: inline-block; padding: 3px 10px; border-radius: 999px; '
        f'background-color: {fondo}; color: {color}; font-size: 12px; font-weight: bold;">{estado}</span>'
    )


def _get_estado_alerta(estado: str) -> str:
    estilos = {
        "habilitado": ("#d4edda", "#28a745", "#155724"),
        "rechazado": ("#f8d7da", "#dc3545", "#721c24"),
        "autorizado solicitud previa": ("#f4ecf7", "#8e44ad", "#6c3483"),
        "pendiente": ("#fff3cd", "#ffc107", "#856404"),
    }
    fondo, borde, color = estilos.get(estado.strip().lower(), ("#e9ecef", "#6c757d", "#495057"))
    return (
        f"background-color: {fondo}; border-left: 4px solid {borde}; padding: 15px; "
        f"margin: 15px 0; border-radius: 4px; color: {color};"
    )

class SolicitudParametroService:

    def __init__(self):
        self.repository = SolicitudParametroRepository()

    def listar(self, db: Session):
        solicitudes = db.query(SolicitudParametro).order_by(SolicitudParametro.oid.desc()).all()
        return [self._enriquecer_solicitud(item) for item in solicitudes]

    @staticmethod
    def _normalize_tipo(tipo_parametro: str) -> str:
        return tipo_parametro.strip().lower()

    @staticmethod
    def _obtener_destinatarios(db: Session, tipo_parametro: str) -> list[str]:
        try:
            from app.models.solicitud_parametro import ConfiguracionParametros
            conf = db.query(ConfiguracionParametros).first()
            if conf:
                t = (tipo_parametro or "").strip().lower()
                emails_str = None
                if "historia" in t:
                    emails_str = conf.correos_historia_clinica
                elif "enfermer" in t:
                    emails_str = conf.correos_enfermeria
                elif "otro" in t:
                    emails_str = conf.correos_otros

                if emails_str:
                    return [e.strip() for e in emails_str.replace(";", ",").split(",") if e.strip()]
        except Exception as exc:
            logger.warning("Error resolviendo destinatarios de correo: %s", exc)
        return []

    @staticmethod
    def _calcular_total(tipo_parametro: str, fecha_apertura, fecha_cierre):
        dias_inclusivos = (fecha_cierre - fecha_apertura).days + 1
        if tipo_parametro == "enfermeria":
            return dias_inclusivos * 24, "hr"
        if tipo_parametro == "historia clinica":
            return dias_inclusivos, "dias"
        return None, None

    @staticmethod
    def _buscar_paciente_por_ingreso(ingreso: str | None):
        ingreso_normalizado = (ingreso or "").strip()
        if not ingreso_normalizado:
            return None
        try:
            from app.core.sql_server import get_paciente_por_ingreso
            return get_paciente_por_ingreso(ingreso_normalizado)
        except Exception as exc:
            logger.warning("No se pudo consultar el paciente por ingreso %s: %s", ingreso_normalizado, exc)
            return None

    def _enriquecer_solicitud(self, solicitud: SolicitudParametro):
        solicitud.ingreso = (solicitud.ingreso or "").strip() or None
        solicitud.medico = (solicitud.medico or "").strip() or None
        paciente = self._buscar_paciente_por_ingreso(solicitud.ingreso)
        solicitud.nombre_paciente = paciente["nombre_completo"] if paciente else None
        return solicitud

    def _generar_consecutivo(self, db: Session, now: datetime) -> str:
        prefix = f"{now.year}-{now.month:02d}"
        last = (
            db.query(SolicitudParametro)
            .filter(SolicitudParametro.consecutivo.isnot(None), SolicitudParametro.consecutivo != "")
            .order_by(SolicitudParametro.oid.desc())
            .first()
        )
        if last and last.consecutivo:
            try:
                num = int(last.consecutivo.split("-")[-1]) + 1
            except Exception:
                num = 1
        else:
            num = 1
        return f"{prefix}-{num:03d}"

    def _build_notification_body(self, data: SolicitudParametroCreate, total_valor, total_unidad, fecha_apertura, fecha_cierre, consecutivo: str = ""):
        estado = "Pendiente"
        total = f"{total_valor} {total_unidad}" if total_valor is not None and total_unidad else "No aplica"
        
        # Formateo preventivo de fechas
        f_apertura = fecha_apertura.strftime('%Y-%m-%d') if hasattr(fecha_apertura, 'strftime') else (fecha_apertura or 'No aplica')
        f_cierre = fecha_cierre.strftime('%Y-%m-%d') if hasattr(fecha_cierre, 'strftime') else (fecha_cierre or 'No aplica')

        # Bloques de filas dinámicas
        info_paciente = ""
        ingreso = (data.ingreso or "").strip()
        medico = (data.medico or "").strip()
        paciente = self._buscar_paciente_por_ingreso(ingreso)
        if paciente and paciente.get("nombre_completo"):
            info_paciente += f'<tr><td style="{estilo_celda_label}">Paciente</td><td style="{estilo_celda_valor}">{paciente["nombre_completo"]}</td></tr>'
        if ingreso:
            info_paciente += f'<tr><td style="{estilo_celda_label}">Ingreso</td><td style="{estilo_celda_valor}">{ingreso}</td></tr>'
        if medico:
            info_paciente += f'<tr><td style="{estilo_celda_label}">Médico</td><td style="{estilo_celda_valor}">{medico}</td></tr>'

        horas_info = ""
        if data.hora_apertura:
            horas_info += f'<tr><td style="{estilo_celda_label}">Hora de inicio</td><td style="{estilo_celda_valor}">{data.hora_apertura}</td></tr>'
        if data.hora_cierre:
            horas_info += f'<tr><td style="{estilo_celda_label}">Hora final</td><td style="{estilo_celda_valor}">{data.hora_cierre}</td></tr>'

        cons_line = f"""
            <tr>
                <td style="{estilo_celda_label}">Consecutivo</td>
                <td style="{estilo_celda_valor}">{consecutivo}</td>
            </tr>
        """ if consecutivo else ""

        # Retornamos la estructura HTML envolvente utilizando los estilos del módulo global
        return f"""
        <div style="{estilo_contenedor}">
            <div style="{estilo_header}">
                <h2 style="margin: 0; color: #ffffff;">Nueva Solicitud de Parámetro Registrada</h2>
            </div>
            <div style="padding: 20px;">
                <p>Se ha registrado una nueva solicitud de parámetro en el sistema con los siguientes detalles:</p>
                
                <table style="{estilo_tabla}">
                    {cons_line}
                    <tr>
                        <td style="{estilo_celda_label}">Tipo de parámetro</td>
                        <td style="{estilo_celda_valor}">{data.tipo_parametro}</td>
                    </tr>
                    <tr>
                        <td style="{estilo_celda_label}">Solicitante</td>
                        <td style="{estilo_celda_valor}">{data.solicitante}</td>
                    </tr>
                    <tr>
                        <td style="{estilo_celda_label}">Área</td>
                        <td style="{estilo_celda_valor}">{data.area or "No especificada"}</td>
                    </tr>
                    <tr>
                        <td style="{estilo_celda_label}">Descripción</td>
                        <td style="{estilo_celda_valor}">{data.descripcion.strip()}</td>
                    </tr>
                    <tr>
                        <td style="{estilo_celda_label}">Fecha de apertura</td>
                        <td style="{estilo_celda_valor}">{f_apertura}</td>
                    </tr>
                    <tr>
                        <td style="{estilo_celda_label}">Fecha de cierre</td>
                        <td style="{estilo_celda_valor}">{f_cierre}</td>
                    </tr>
                    {horas_info}
                    <tr>
                        <td style="{estilo_celda_label}">Total</td>
                        <td style="{estilo_celda_valor}">{total}</td>
                    </tr>
                    {info_paciente}
                    <tr>
                        <td style="{estilo_celda_label}">Estado</td>
                        <td style="{estilo_celda_valor}">{_get_estado_badge(estado)}</td>
                    </tr>
                </table>

                <div style="{_get_estado_alerta(estado)}">
                    <strong>Estado:</strong> {estado}
                </div>
            </div>
        </div>
        """

    def crear(self, db: Session, data: SolicitudParametroCreate):
        # ... (Tu lógica de validación previa permanece idéntica) ...
        tipo_normalizado = self._normalize_tipo(data.tipo_parametro)
        descripcion_limpia = data.descripcion.strip()
        area_limpia = data.area.strip() if data.area and data.area.strip() else None

        if not area_limpia:
            raise ValueError("El área solicitante es obligatoria.")

        now = datetime.now()
        consecutivo = self._generar_consecutivo(db, now)

        fecha_apertura = data.fecha_apertura
        fecha_cierre = data.fecha_cierre
        hora_apertura = data.hora_apertura.strip() if data.hora_apertura and data.hora_apertura.strip() else None
        hora_cierre = data.hora_cierre.strip() if data.hora_cierre and data.hora_cierre.strip() else None
        ingreso = data.ingreso.strip() if data.ingreso and data.ingreso.strip() else None
        medico = data.medico.strip() if data.medico and data.medico.strip() else None
        total_valor = None
        total_unidad = None
 
        if tipo_normalizado == "historia clinica":
            if not ingreso or not medico:
                raise ValueError("Para historia clinica es obligatorio el medico y el ingreso.")
        elif tipo_normalizado == "enfermeria":
            if not ingreso:
                raise ValueError("Para enfermeria es obligatorio el ingreso.")

        if tipo_normalizado == "otros":
            if len(descripcion_limpia) < 50:
                raise ValueError("Para tipo 'Otros', la descripción debe tener al menos 50 caracteres.")
            if fecha_apertura is None:
                raise ValueError("Para tipo 'Otros', la fecha de apertura es obligatoria.")
            if not hora_apertura:
                raise ValueError("Para tipo 'Otros', la hora de inicio es obligatoria.")
            if fecha_cierre is not None and fecha_cierre < fecha_apertura:
                raise ValueError("La fecha de cierre no puede ser menor que la fecha de apertura.")
        elif tipo_normalizado in {"enfermeria", "historia clinica"}:
            if fecha_apertura is None or fecha_cierre is None:
                raise ValueError("Debe registrar fecha de apertura y fecha de cierre.")
            if fecha_cierre < fecha_apertura:
                raise ValueError("La fecha de cierre no puede ser menor que la fecha de apertura.")
            total_valor, total_unidad = self._calcular_total(tipo_normalizado, fecha_apertura, fecha_cierre)
        else:
            raise ValueError("Tipo de parámetro no permitido.")

        nueva = SolicitudParametro(
            consecutivo=consecutivo,
            tipo_parametro=data.tipo_parametro,
            descripcion=descripcion_limpia,
            fecha_apertura=fecha_apertura,
            fecha_cierre=fecha_cierre,
            hora_apertura=hora_apertura,
            hora_cierre=hora_cierre,
            total_valor=total_valor,
            total_unidad=total_unidad,
            solicitante=data.solicitante,
            area=area_limpia,
            ingreso=ingreso,
            medico=medico if tipo_normalizado == "historia clinica" else None,
            estado="Pendiente",
            fecha_registro=now
        )
        creada = self._enriquecer_solicitud(self.repository.create(db, nueva))

        try:
            send_email(
                subject=f"Nueva solicitud de parametro registrada ({consecutivo})",
                body=self._build_notification_body(
                    data=data,
                    total_valor=total_valor,
                    total_unidad=total_unidad,
                    fecha_apertura=fecha_apertura,
                    fecha_cierre=fecha_cierre,
                    consecutivo=consecutivo
                ),
                recipients=self._obtener_destinatarios(db, data.tipo_parametro),
                is_html=True,
                include_inline_signature=False,
            )
        except Exception as exc:
            logger.warning("No se pudo enviar notificacion por correo para solicitud %s: %s", creada.oid, exc)

        return creada

    def habilitar(self, db: Session, oid: int, data: SolicitudHabilitarAction):
        solicitud = self.repository.get_by_id(db, oid)
        if solicitud is None:
            raise ValueError("La solicitud no existe")

        tipo = self._normalize_tipo(solicitud.tipo_parametro)
        estado_msg = ""

        if tipo == "historia clinica":
            val = data.hcpdiaaut if data.hcpdiaaut is not None else (solicitud.total_valor or 30)
            update_parametro_historia_clinica(val)
            estado_msg = f"Habilitado con valor {val} días"
        elif tipo == "enfermeria":
            val_crenf = data.hcnmhcrenf if data.hcnmhcrenf is not None else (solicitud.total_valor or 48)
            val_aplmed = data.hcnhaplmed if data.hcnhaplmed is not None else (solicitud.total_valor or 48)
            update_parametro_enfermeria(val_crenf, val_aplmed)
            estado_msg = f"Habilitado con valores: {val_crenf}"
        elif tipo == "otros":
            estado_msg = "Habilitado / Registrado según observación"

        solicitud.estado = "Habilitado"
        solicitud.observacion_resolucion = data.observacion

        updated = self.repository.update(db, solicitud)

        # Notification
        try:
            estado = "Habilitado"
            body = f"""
                <div style="{estilo_contenedor}">
                    <div style="{estilo_header}">
                        <h2>Parámetro Clínico Habilitado</h2>
                    </div>
                    <table style="{estilo_tabla}">
                        <tr>
                            <td style="{estilo_celda_label}">Consecutivo</td>
                            <td style="{estilo_celda_valor}">{solicitud.consecutivo or solicitud.oid}</td>
                        </tr>
                        <tr>
                            <td style="{estilo_celda_label}">Tipo</td>
                            <td style="{estilo_celda_valor}">{solicitud.tipo_parametro}</td>
                        </tr>
                        <tr>
                            <td style="{estilo_celda_label}">Solicitante</td>
                            <td style="{estilo_celda_valor}">{solicitud.solicitante}</td>
                        </tr>
                        <tr>
                            <td style="{estilo_celda_label}">Área</td>
                            <td style="{estilo_celda_valor}">{solicitud.area or '—'}</td>
                        </tr>
                        <tr>
                            <td style="{estilo_celda_label}">Detalle</td>
                            <td style="{estilo_celda_valor}">{estado_msg}</td>
                        </tr>
                        <tr>
                            <td style="{estilo_celda_label}">Observación</td>
                            <td style="{estilo_celda_valor}">{data.observacion or 'Sin observación'}</td>
                        </tr>
                        <tr>
                            <td style="{estilo_celda_label}">Estado</td>
                            <td style="{estilo_celda_valor}">{_get_estado_badge(estado)}</td>
                        </tr>
                    </table>
                    <div style="{_get_estado_alerta(estado)}">
                        <strong>Estado:</strong> {estado}
                    </div>
                </div>
            """
            #body = (
            #    f"Se ha habilitado la solicitud de parámetro {solicitud.consecutivo or solicitud.oid}.\n\n"
            #    f"Tipo: {solicitud.tipo_parametro}\n"
            #    f"Solicitante: {solicitud.solicitante}\n"
            #    f"Área: {solicitud.area or '—'}\n"
            #    f"Detalle: {estado_msg}\n"
            #    f"Observación: {data.observacion or 'Sin observación'}\n"
            #    f"Estado: Habilitado\n"
            #)
            send_email(
                subject=f"Parámetro Clínico Habilitado - {solicitud.consecutivo or solicitud.tipo_parametro}",
                body=body,
                recipients=self._obtener_destinatarios(db, solicitud.tipo_parametro),
                is_html=True,
                include_inline_signature=False,
            )
        except Exception as exc:
            logger.warning("No se pudo enviar notificación de habilitación: %s", exc)

        return self._enriquecer_solicitud(updated)

    def rechazar(self, db: Session, oid: int, data: SolicitudRechazarAction):
        solicitud = self.repository.get_by_id(db, oid)
        if solicitud is None:
            raise ValueError("La solicitud no existe")

        solicitud.estado = "Rechazado"
        solicitud.motivo_rechazo = data.motivo.strip()
        updated = self.repository.update(db, solicitud)

        # Notification
        try:
            estado = "Rechazado"
            body = f"""
                <div style="{estilo_contenedor}">
                    <div style="{estilo_header}">
                        <h2>Solicitud de Parámetro Rechazada</h2>
                    </div>
                    <table style="{estilo_tabla}">
                        <tr>
                            <td style="{estilo_celda_label}">Consecutivo</td>
                            <td style="{estilo_celda_valor}">{solicitud.consecutivo or solicitud.oid}</td>
                        </tr>
                        <tr>
                            <td style="{estilo_celda_label}">Tipo</td>
                            <td style="{estilo_celda_valor}">{solicitud.tipo_parametro}</td>
                        </tr>
                        <tr>
                            <td style="{estilo_celda_label}">Solicitante</td>
                            <td style="{estilo_celda_valor}">{solicitud.solicitante}</td>
                        </tr>
                        <tr>
                            <td style="{estilo_celda_label}">Área</td>
                            <td style="{estilo_celda_valor}">{solicitud.area or '—'}</td>
                        </tr>
                        <tr>
                            <td style="{estilo_celda_label}">Motivo de rechazo</td>
                            <td style="{estilo_celda_valor}">{data.motivo.strip()}</td>
                        </tr>
                        <tr>
                            <td style="{estilo_celda_label}">Estado</td>
                            <td style="{estilo_celda_valor}">{_get_estado_badge(estado)}</td>
                        </tr>
                    </table>
                    <div style="{_get_estado_alerta(estado)}">
                        <strong>Estado:</strong> {estado}
                    </div>
                </div>
            """
            #body = (
            #    f"Se ha rechazado la solicitud de parámetro {solicitud.consecutivo or solicitud.oid}.\n\n"
            #    f"Tipo: {solicitud.tipo_parametro}\n"
            #    f"Solicitante: {solicitud.solicitante}\n"
            #    f"Área: {solicitud.area or '—'}\n"
            #    f"Motivo de rechazo: {data.motivo.strip()}\n"
            #    f"Estado: Rechazado\n"
            #)
            send_email(
                subject=f"Solicitud de Parámetro Rechazada - {solicitud.consecutivo or solicitud.tipo_parametro}",
                body=body,
                recipients=self._obtener_destinatarios(db, solicitud.tipo_parametro),
                is_html=True,
                include_inline_signature=False,
            )
        except Exception as exc:
            logger.warning("No se pudo enviar notificación de rechazo: %s", exc)

        return self._enriquecer_solicitud(updated)

    def habilitar_extension(self, db: Session, oid: int, data: SolicitudExtensionAction):
        solicitud = self.repository.get_by_id(db, oid)
        if solicitud is None:
            raise ValueError("La solicitud no existe")

        solicitud.estado = "Autorizado Solicitud Previa"
        solicitud.solicitud_extension = data.solicitud_extension.strip()
        solicitud.observacion_resolucion = data.observacion.strip() if data.observacion else None
        updated = self.repository.update(db, solicitud)

        # Notification
        try:
            estado = "Autorizado Solicitud Previa"
            body = f"""
                <div style="{estilo_contenedor}">
                    <div style="{estilo_header}">
                        <h2>Parámetro Autorizado Solicitud Previa</h2>
                    </div>
                    <table style="{estilo_tabla}">
                        <tr>
                            <td style="{estilo_celda_label}">Consecutivo</td>
                            <td style="{estilo_celda_valor}">{solicitud.consecutivo or solicitud.oid}</td>
                        </tr>
                        <tr>
                            <td style="{estilo_celda_label}">Tipo</td>
                            <td style="{estilo_celda_valor}">{solicitud.tipo_parametro}</td>
                        </tr>
                        <tr>
                            <td style="{estilo_celda_label}">Solicitante</td>
                            <td style="{estilo_celda_valor}">{solicitud.solicitante}</td>
                        </tr>
                        <tr>
                            <td style="{estilo_celda_label}">Área</td>
                            <td style="{estilo_celda_valor}">{solicitud.area or '—'}</td>
                        </tr>
                        <tr>
                            <td style="{estilo_celda_label}">Autorizado bajo la solicitud</td>
                            <td style="{estilo_celda_valor}">{data.solicitud_extension.strip()}</td>
                        </tr>
                        <tr>
                            <td style="{estilo_celda_label}">Observación</td>
                            <td style="{estilo_celda_valor}">{data.observacion or 'Sin observación'}</td>
                        </tr>
                        <tr>
                            <td style="{estilo_celda_label}">Estado</td>
                            <td style="{estilo_celda_valor}">{_get_estado_badge(estado)}</td>
                        </tr>
                    </table>
                    <div style="{_get_estado_alerta(estado)}">
                        <strong>Estado:</strong> {estado}
                    </div>
                </div>
            """
            #body = (
            #    f"Se ha autorizado bajo solicitud previa el parámetro {solicitud.consecutivo or solicitud.oid}.\n\n"
            #    f"Tipo: {solicitud.tipo_parametro}\n"
            #    f"Solicitante: {solicitud.solicitante}\n"
            #    f"Área: {solicitud.area or '—'}\n"
            #    f"Autorizado bajo la solicitud: {data.solicitud_extension.strip()}\n"
            #    f"Observación: {data.observacion or 'Sin observación'}\n"
            #    f"Estado: Autorizado Solicitud Previa\n"
            #)
            send_email(
                subject=f"Parámetro Autorizado Solicitud Previa - {solicitud.consecutivo or solicitud.tipo_parametro}",
                body=body,
                recipients=self._obtener_destinatarios(db, solicitud.tipo_parametro),
                is_html=True,
                include_inline_signature=False,
            )
        except Exception as exc:
            logger.warning("No se pudo enviar notificación de autorización previa: %s", exc)

        return self._enriquecer_solicitud(updated)

    def aprobar(self, db: Session, oid: int):
        solicitud = self.repository.get_by_id(db, oid)
        if solicitud is None:
            raise ValueError("La solicitud no existe")
        solicitud.estado = "Habilitado"
        return self._enriquecer_solicitud(self.repository.update(db, solicitud))
