from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    APP_NAME: str
    APP_VERSION: str

    HOST: str
    PORT: int

    DB_HOST: str
    DB_PORT: int
    DB_NAME: str
    DB_USER: str
    DB_PASSWORD: str

    DB_SERVER: str
    DB_DATABASE: str
    DB_USER_SQL: str
    DB_PASSWORD_SQL: str
    DB_DRIVER: str
    DB_TRUST_CERTIFICATE: str

    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int

    COORD_USERNAME: str
    COORD_PASSWORD: str

    UPLOAD_FOLDER: str

    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM: Optional[str] = None
    SMTP_USE_TLS: bool = True
    SMTP_USE_SSL: bool = False

    VERSION_SMTP_HOST: Optional[str] = None
    VERSION_SMTP_PORT: Optional[int] = None
    VERSION_SMTP_USER: Optional[str] = None
    VERSION_SMTP_PASSWORD: Optional[str] = None
    VERSION_SMTP_FROM: Optional[str] = None
    VERSION_SMTP_USE_TLS: Optional[bool] = None
    VERSION_SMTP_USE_SSL: Optional[bool] = None

    # Cuenta remitente para notificaciones de solicitudes de acceso.
    ACCESS_REQUEST_SMTP_HOST: Optional[str] = None
    ACCESS_REQUEST_SMTP_PORT: Optional[int] = None
    ACCESS_REQUEST_SMTP_USER: Optional[str] = None
    ACCESS_REQUEST_SMTP_PASSWORD: Optional[str] = None
    ACCESS_REQUEST_SMTP_FROM: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
