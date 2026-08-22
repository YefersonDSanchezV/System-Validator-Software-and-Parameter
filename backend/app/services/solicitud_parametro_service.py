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


class SolicitudParametroService:

    def __init__(self):
        self.repository = SolicitudParametroRepository()

    def listar(self, db: Session):
        return db.query(SolicitudParametro).order_by(SolicitudParametro.oid.desc()).all()

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

    def _generar_consecutivo(self, db: Session, now: datetime) -> str:
        prefix = f"{now.year}-{now.month:02d}"
        pattern = f"{prefix}-%"
        last = (
            db.query(SolicitudParametro)
            .filter(SolicitudParametro.consecutivo.like(pattern))
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

    @staticmethod
    def _build_notification_body(data: SolicitudParametroCreate, total_valor, total_unidad, fecha_apertura, fecha_cierre, consecutivo: str = ""):
        total = f"{total_valor} {total_unidad}" if total_valor is not None and total_unidad else "No aplica"
        
        info_paciente = ""
        if data.ingreso:
            from app.core.sql_server import get_paciente_por_ingreso
            paciente = get_paciente_por_ingreso(data.ingreso)
            if paciente:
                info_paciente = f"\nPaciente: {paciente['nombre_completo']}\nIngreso: {data.ingreso}\n"
        if data.medico:
            info_paciente += f"Medico: {data.medico}\n"

        horas_info = ""
        if data.hora_apertura:
            horas_info += f"Hora de inicio: {data.hora_apertura}\n"
        if data.hora_cierre:
            horas_info += f"Hora final: {data.hora_cierre}\n"

        cons_line = f"Consecutivo: {consecutivo}\n" if consecutivo else ""

        return (
            "Se registro una nueva solicitud de parametro.\n\n"
            f"{cons_line}"
            f"Tipo de parametro: {data.tipo_parametro}\n"
            f"Solicitante: {data.solicitante}\n"
            f"Area: {data.area or 'No especificada'}\n"
            f"Descripcion: {data.descripcion.strip()}\n"
            f"Fecha de apertura: {fecha_apertura or 'No aplica'}\n"
            f"Fecha de cierre: {fecha_cierre or 'No aplica'}\n"
            f"{horas_info}"
            f"Total: {total}\n"
            f"{info_paciente}"
            "Estado: Pendiente\n"
        )

    def crear(self, db: Session, data: SolicitudParametroCreate):
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
        total_valor = None
        total_unidad = None

        if tipo_normalizado == "historia clinica":
            if not data.ingreso or not data.medico:
                raise ValueError("Para historia clinica es obligatorio el medico y el ingreso.")
        elif tipo_normalizado == "enfermeria":
            if not data.ingreso:
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
            estado="Pendiente",
            fecha_registro=now
        )
        creada = self.repository.create(db, nueva)

        # Notification should not block business flow if SMTP is unavailable.
        try:
            send_email(
                subject=f"Nueva solicitud de parametro registrada ({consecutivo})",
                body=self._build_notification_body(
                    data=data,
                    total_valor=total_valor,
                    total_unidad=total_unidad,
                    fecha_apertura=fecha_apertura,
                    fecha_cierre=fecha_cierre,
                    consecutivo=consecutivo,
                ),
                recipients=self._obtener_destinatarios(db, data.tipo_parametro),
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
            estado_msg = f"Habilitado con valores HCNMHRCRENF={val_crenf}, HCNHAPLMED={val_aplmed}"
        elif tipo == "otros":
            estado_msg = "Habilitado / Registrado según observación"

        solicitud.estado = "Habilitado"
        solicitud.observacion_resolucion = data.observacion

        updated = self.repository.update(db, solicitud)

        # Notification
        try:
            body = (
                f"Se ha habilitado la solicitud de parámetro {solicitud.consecutivo or solicitud.oid}.\n\n"
                f"Tipo: {solicitud.tipo_parametro}\n"
                f"Solicitante: {solicitud.solicitante}\n"
                f"Área: {solicitud.area or '—'}\n"
                f"Detalle: {estado_msg}\n"
                f"Observación: {data.observacion or 'Sin observación'}\n"
                f"Estado: Habilitado\n"
            )
            send_email(
                subject=f"Parámetro Clínico Habilitado - {solicitud.consecutivo or solicitud.tipo_parametro}",
                body=body,
                recipients=self._obtener_destinatarios(db, solicitud.tipo_parametro),
            )
        except Exception as exc:
            logger.warning("No se pudo enviar notificación de habilitación: %s", exc)

        return updated

    def rechazar(self, db: Session, oid: int, data: SolicitudRechazarAction):
        solicitud = self.repository.get_by_id(db, oid)
        if solicitud is None:
            raise ValueError("La solicitud no existe")

        solicitud.estado = "Rechazado"
        solicitud.motivo_rechazo = data.motivo.strip()
        updated = self.repository.update(db, solicitud)

        # Notification
        try:
            body = (
                f"Se ha rechazado la solicitud de parámetro {solicitud.consecutivo or solicitud.oid}.\n\n"
                f"Tipo: {solicitud.tipo_parametro}\n"
                f"Solicitante: {solicitud.solicitante}\n"
                f"Área: {solicitud.area or '—'}\n"
                f"Motivo de rechazo: {data.motivo.strip()}\n"
                f"Estado: Rechazado\n"
            )
            send_email(
                subject=f"Solicitud de Parámetro Rechazada - {solicitud.consecutivo or solicitud.tipo_parametro}",
                body=body,
                recipients=self._obtener_destinatarios(db, solicitud.tipo_parametro),
            )
        except Exception as exc:
            logger.warning("No se pudo enviar notificación de rechazo: %s", exc)

        return updated

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
            body = (
                f"Se ha autorizado bajo solicitud previa el parámetro {solicitud.consecutivo or solicitud.oid}.\n\n"
                f"Tipo: {solicitud.tipo_parametro}\n"
                f"Solicitante: {solicitud.solicitante}\n"
                f"Área: {solicitud.area or '—'}\n"
                f"Autorizado bajo la solicitud: {data.solicitud_extension.strip()}\n"
                f"Observación: {data.observacion or 'Sin observación'}\n"
                f"Estado: Autorizado Solicitud Previa\n"
            )
            send_email(
                subject=f"Parámetro Autorizado Solicitud Previa - {solicitud.consecutivo or solicitud.tipo_parametro}",
                body=body,
                recipients=self._obtener_destinatarios(db, solicitud.tipo_parametro),
            )
        except Exception as exc:
            logger.warning("No se pudo enviar notificación de autorización previa: %s", exc)

        return updated

    def aprobar(self, db: Session, oid: int):
        solicitud = self.repository.get_by_id(db, oid)
        if solicitud is None:
            raise ValueError("La solicitud no existe")
        solicitud.estado = "Habilitado"
        return self.repository.update(db, solicitud)
