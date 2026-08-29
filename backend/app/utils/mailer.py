from __future__ import annotations

import os
import smtplib
import logging
from dataclasses import dataclass
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage

from app.core.config import settings

logger = logging.getLogger(__name__)

@dataclass(frozen=True)
class MailerConfig:
    host: str | None
    port: int
    user: str | None
    password: str | None
    from_email: str | None
    use_tls: bool
    use_ssl: bool


@dataclass(frozen=True)
class MailAttachment:
    filename: str
    content: bytes
    mime_subtype: str = "octet-stream"


SIGNATURE_FILE_NAME = "Firma Jose.png"


def get_default_mailer_config() -> MailerConfig:
    return MailerConfig(
        host=settings.SMTP_HOST,
        port=settings.SMTP_PORT,
        user=settings.SMTP_USER,
        password=settings.SMTP_PASSWORD,
        from_email=settings.SMTP_FROM,
        use_tls=settings.SMTP_USE_TLS,
        use_ssl=settings.SMTP_USE_SSL,
    )


def get_version_mailer_config() -> MailerConfig:
    return MailerConfig(
        host=settings.VERSION_SMTP_HOST or settings.SMTP_HOST,
        port=settings.VERSION_SMTP_PORT or settings.SMTP_PORT,
        user=settings.VERSION_SMTP_USER or settings.SMTP_USER,
        password=settings.VERSION_SMTP_PASSWORD or settings.SMTP_PASSWORD,
        from_email=settings.VERSION_SMTP_FROM or settings.SMTP_FROM,
        use_tls=settings.VERSION_SMTP_USE_TLS if settings.VERSION_SMTP_USE_TLS is not None else settings.SMTP_USE_TLS,
        use_ssl=settings.VERSION_SMTP_USE_SSL if settings.VERSION_SMTP_USE_SSL is not None else settings.SMTP_USE_SSL,
    )


def _get_signature_directories() -> list[str]:
    directories = ["/app/uploads/firmas"]
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    directories.append(os.path.join(base_dir, "uploads", "firmas"))
    return directories


def _find_signature_image_path() -> str | None:
    for directory in _get_signature_directories():
        if not os.path.isdir(directory):
            continue
        try:
            for entry in os.listdir(directory):
                if entry.lower() == SIGNATURE_FILE_NAME.lower():
                    return os.path.join(directory, entry)
        except OSError as exc:
            logger.warning("No se pudo inspeccionar el directorio de firmas %s: %s", directory, exc)
    return None


def build_signature_html() -> str:
    if _find_signature_image_path():
        return """
        <div style="margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 20px;">
            <img src="cid:firma_institucional" alt="Firma ICVC" style="max-width: 100%; height: auto; display: block;">
        </div>
        """
    return """
    <div style="margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 20px; font-family: Arial, sans-serif;">
        <p style="margin: 0; font-size: 14px; font-weight: bold; color: #2c3e50;">Jose</p>
        <p style="margin: 4px 0 0; font-size: 12px; color: #566573;">Coordinador de Sistemas</p>
    </div>
    """


def send_email(
    subject: str,
    body: str,
    recipients: list[str],
    is_html: bool = False,
    mailer_config: MailerConfig | None = None,
    include_inline_signature: bool = True,
    attachments: list[MailAttachment] | None = None,
    custom_signature_path: str | None = None,
) -> None:
    if not recipients:
        return

    config = mailer_config or get_default_mailer_config()

    if not config.host or not config.from_email:
        raise ValueError("SMTP no configurado. Defina la configuración SMTP correspondiente en .env")

    has_attachments = bool(attachments)
    if is_html:
        body_container = MIMEMultipart("related")
        body_container.attach(MIMEText(body, "html", "utf-8"))

        if custom_signature_path and os.path.isfile(custom_signature_path):
            try:
                with open(custom_signature_path, "rb") as f:
                    custom_data = f.read()
                img_custom = MIMEImage(custom_data)
                img_custom.add_header("Content-ID", "<firma_custom>")
                img_custom.add_header("Content-Disposition", "inline", filename=os.path.basename(custom_signature_path))
                body_container.attach(img_custom)
                logger.info("Firma personalizada adjuntada correctamente desde: %s", custom_signature_path)
            except Exception as e:
                logger.error("Error al adjuntar firma personalizada: %s", e)

        ruta_firma = _find_signature_image_path() if include_inline_signature else None

        if ruta_firma:
            try:
                with open(ruta_firma, "rb") as f:
                    img_data = f.read()

                img_firma = MIMEImage(img_data)
                img_firma.add_header("Content-ID", "<firma_institucional>")
                img_firma.add_header("Content-Disposition", "inline", filename=os.path.basename(ruta_firma))
                body_container.attach(img_firma)
                logger.info("Firma institucional adjuntada correctamente desde: %s", ruta_firma)
            except Exception as e:
                logger.error("Error al leer el archivo de la firma: %s", e)
        else:
            if include_inline_signature:
                logger.warning("No se encontró la firma gráfica configurada para correos HTML: %s", SIGNATURE_FILE_NAME)

        if has_attachments:
            message = MIMEMultipart("mixed")
            message.attach(body_container)
        else:
            message = body_container

        message["Subject"] = subject
        message["From"] = config.from_email
        message["To"] = ", ".join(recipients)
    else:
        if has_attachments:
            message = MIMEMultipart("mixed")
            message.attach(MIMEText(body, "plain", "utf-8"))
        else:
            message = MIMEText(body, "plain", "utf-8")
        message["Subject"] = subject
        message["From"] = config.from_email
        message["To"] = ", ".join(recipients)

    for attachment in attachments or []:
        part = MIMEApplication(attachment.content, _subtype=attachment.mime_subtype)
        part.add_header("Content-Disposition", "attachment", filename=attachment.filename)
        message.attach(part)

    use_ssl = config.use_ssl or (config.port == 465 and not config.use_tls)
    smtp_cls = smtplib.SMTP_SSL if use_ssl else smtplib.SMTP

    with smtp_cls(config.host, config.port, timeout=30) as server:
        if config.use_tls and not use_ssl:
            server.starttls()
        if config.user:
            server.login(config.user, config.password or "")
        server.sendmail(config.from_email, recipients, message.as_string())
