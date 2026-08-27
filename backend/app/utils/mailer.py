from __future__ import annotations

import os
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage

from app.core.config import settings

logger = logging.getLogger(__name__)

def send_email(subject: str, body: str, recipients: list[str], is_html: bool = False) -> None:
    if not recipients:
        return

    if not settings.SMTP_HOST or not settings.SMTP_FROM:
        raise ValueError("SMTP no configurado. Defina SMTP_HOST y SMTP_FROM en .env")

    if is_html:
        message = MIMEMultipart("related")
        message["Subject"] = subject
        message["From"] = settings.SMTP_FROM
        message["To"] = ", ".join(recipients)
        
        message.attach(MIMEText(body, "html", "utf-8"))
        
        # --- RUTA DIRECTA AL DIRECTORIO DE SUBIDAS CONFIRMADO ---
        # Nos paramos en la carpeta raíz del contenedor e ingresamos a 'uploads/'
        ruta_firma = "/app/uploads/firmas/Firma Jose.png"
        
        # Fallback por si corre de forma local fuera de Docker
        if not os.path.exists(ruta_firma):
            base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
            ruta_firma = os.path.join(base_dir, "uploads", "firmas", "Firma Jose.png")



        # Verificación y adjunto
        if os.path.exists(ruta_firma):
            try:
                with open(ruta_firma, "rb") as f:
                    img_data = f.read()
                
                img_firma = MIMEImage(img_data)
                img_firma.add_header("Content-ID", "<firma_institucional>")
                img_firma.add_header("Content-Disposition", "inline", filename="Firma_Jose.png")
                message.attach(img_firma)
                logger.info("Firma institucional adjuntada correctamente desde: %s", ruta_firma)
            except Exception as e:
                logger.error("Error al leer el archivo de la firma: %s", e)
        else:
            # ESTA ALERTA SALDRÁ EN TU TERMINAL DE UVICORN SI NO SE ENCUENTRA EL ARCHIVO
            logger.warning(
                "¡ALERTA! El sistema de correo no pudo encontrar la firma física en el disco. "
                "Por favor verifica si el archivo existe en esta ruta absoluta: %s", 
                os.path.abspath(ruta_firma)
            )
    else:
        message = MIMEText(body, "plain", "utf-8")
        message["Subject"] = subject
        message["From"] = settings.SMTP_FROM
        message["To"] = ", ".join(recipients)

    use_ssl = settings.SMTP_USE_SSL or (settings.SMTP_PORT == 465 and not settings.SMTP_USE_TLS)
    smtp_cls = smtplib.SMTP_SSL if use_ssl else smtplib.SMTP

    with smtp_cls(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30) as server:
        if settings.SMTP_USE_TLS and not use_ssl:
            server.starttls()
        if settings.SMTP_USER:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD or "")
        server.sendmail(settings.SMTP_FROM, recipients, message.as_string())
