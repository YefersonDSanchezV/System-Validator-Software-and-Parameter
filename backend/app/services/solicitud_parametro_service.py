from datetime import datetime
import logging
from sqlalchemy.orm import Session
from app.models.solicitud_parametro import SolicitudParametro
from app.repositories.solicitud_parametro_repository import SolicitudParametroRepository
from app.schemas.solicitud_parametro import SolicitudParametroCreate
from app.utils.mailer import send_email


NOTIFICATION_RECIPIENTS = [
    "direccion.medica@icvc.co",
    "coordinacion.medica@icvc.co",
    "coordinacion.enfermeria@icvc.co",
    "sistemas@icvc.co",
    "asistente.ingenieria@icvc.co"
]

logger = logging.getLogger(__name__)


class SolicitudParametroService:

    def __init__(self):
        self.repository = SolicitudParametroRepository()

    def listar(self, db: Session):
        return self.repository.get_all(db)

    @staticmethod
    def _normalize_tipo(tipo_parametro: str) -> str:
        return tipo_parametro.strip().lower()

    @staticmethod
    def _calcular_total(tipo_parametro: str, fecha_apertura, fecha_cierre):
        dias_inclusivos = (fecha_cierre - fecha_apertura).days + 1
        if tipo_parametro == "enfermeria":
            return dias_inclusivos * 24, "hr"
        if tipo_parametro == "historia clinica":
            return dias_inclusivos, "dias"
        return None, None

    @staticmethod
    def _build_notification_body(data: SolicitudParametroCreate, total_valor, total_unidad, fecha_apertura, fecha_cierre):
        total = f"{total_valor} {total_unidad}" if total_valor is not None and total_unidad else "No aplica"
        return (
            "Se registro una nueva solicitud de parametro.\n\n"
            f"Tipo de parametro: {data.tipo_parametro}\n"
            f"Solicitante: {data.solicitante}\n"
            f"Descripcion: {data.descripcion.strip()}\n"
            f"Fecha de apertura: {fecha_apertura or 'No aplica'}\n"
            f"Fecha de cierre: {fecha_cierre or 'No aplica'}\n"
            f"Total: {total}\n"
            "Estado: Pendiente\n"
        )

    def crear(self, db: Session, data: SolicitudParametroCreate):
        tipo_normalizado = self._normalize_tipo(data.tipo_parametro)
        descripcion_limpia = data.descripcion.strip()

        fecha_apertura = data.fecha_apertura
        fecha_cierre = data.fecha_cierre
        total_valor = None
        total_unidad = None

        if tipo_normalizado == "otros":
            if len(descripcion_limpia) < 50:
                raise ValueError("Para tipo 'Otros', la descripción debe tener al menos 50 caracteres.")
            fecha_apertura = None
            fecha_cierre = None
        elif tipo_normalizado in {"enfermeria", "historia clinica"}:
            if fecha_apertura is None or fecha_cierre is None:
                raise ValueError("Debe registrar fecha de apertura y fecha de cierre.")
            if fecha_cierre < fecha_apertura:
                raise ValueError("La fecha de cierre no puede ser menor que la fecha de apertura.")
            total_valor, total_unidad = self._calcular_total(tipo_normalizado, fecha_apertura, fecha_cierre)
        else:
            raise ValueError("Tipo de parámetro no permitido.")

        nueva = SolicitudParametro(
            tipo_parametro=data.tipo_parametro,
            descripcion=descripcion_limpia,
            fecha_apertura=fecha_apertura,
            fecha_cierre=fecha_cierre,
            total_valor=total_valor,
            total_unidad=total_unidad,
            solicitante=data.solicitante,
            estado="Pendiente",
            fecha_registro=datetime.now()
        )
        creada = self.repository.create(db, nueva)

        # Notification should not block business flow if SMTP is unavailable.
        try:
            send_email(
                subject="Nueva solicitud de parametro registrada",
                body=self._build_notification_body(
                    data=data,
                    total_valor=total_valor,
                    total_unidad=total_unidad,
                    fecha_apertura=fecha_apertura,
                    fecha_cierre=fecha_cierre,
                ),
                recipients=NOTIFICATION_RECIPIENTS,
            )
        except Exception as exc:
            logger.warning("No se pudo enviar notificacion por correo para solicitud %s: %s", creada.oid, exc)

        return creada

    def aprobar(self, db: Session, oid: int):
        solicitud = self.repository.get_by_id(db, oid)
        if solicitud is None:
            raise ValueError("La solicitud no existe")
        solicitud.estado = "Aprobado"
        return self.repository.update(db, solicitud)
