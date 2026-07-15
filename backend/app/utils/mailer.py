from __future__ import annotations

import smtplib
from email.mime.text import MIMEText

from app.core.config import settings


def send_email(subject: str, body: str, recipients: list[str]) -> None:
    if not recipients:
        return

    if not settings.SMTP_HOST or not settings.SMTP_FROM:
        raise ValueError("SMTP no configurado. Defina SMTP_HOST y SMTP_FROM en .env")

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
