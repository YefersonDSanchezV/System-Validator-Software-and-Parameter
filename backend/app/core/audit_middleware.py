import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.database import SessionLocal
from app.models.auditoria import AuditLog

logger = logging.getLogger(__name__)


def detect_modulo(path: str) -> str:
    path_lower = path.lower()
    if "/versions/restauraciones" in path_lower:
        return "Restauración BD"
    if "/versions" in path_lower:
        return "Versiones"
    if "/boletines" in path_lower:
        return "Boletines"
    if "/manuales" in path_lower:
        return "Manuales de Usuario"
    if "/solicitud-parametro" in path_lower:
        return "Habilitación de Parámetro"
    if "/parametros-clinicos" in path_lower:
        return "Parámetros Clínicos"
    if "/observaciones" in path_lower:
        return "Detalles de Validación"
    if "/auditoria" in path_lower:
        return "Auditoría"
    return "General"


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Process request
        response: Response = await call_next(request)

        # Only audit /api/ endpoints, ignore static assets or docs
        path = request.url.path
        if not path.startswith("/api/"):
            return response

        # Extract client IP
        client_ip = request.headers.get("x-forwarded-for")
        if client_ip:
            client_ip = client_ip.split(",")[0].strip()
        elif request.client and request.client.host:
            client_ip = request.client.host
        else:
            client_ip = "127.0.0.1"

        # Extract user
        user = request.headers.get("x-user-role") or request.headers.get("x-user-name")
        if not user:
            user = "Coordinador de Sistemas" if "coordinator" in request.headers.get("referer", "").lower() else "Usuario Sistema"

        method = request.method.upper()
        modulo = detect_modulo(path)
        status_code = response.status_code

        # Summary detail
        detalle = f"{method} {path} - Status: {status_code}"

        # Write log entry to database asynchronously/safely
        try:
            db = SessionLocal()
            try:
                log_entry = AuditLog(
                    tipo_accion=method,
                    ip_equipo=client_ip,
                    modulo=modulo,
                    usuario=user,
                    detalle=detalle,
                )
                db.add(log_entry)
                db.commit()
            except Exception as e:
                db.rollback()
                logger.error(f"Error escribiendo log de auditoría: {e}")
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Error abriendo sesión DB para auditoría: {e}")

        return response
