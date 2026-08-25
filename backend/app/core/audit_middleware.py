import logging
from ipaddress import ip_address
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


def _is_valid_ip(value: str) -> bool:
    try:
        ip_address(value)
        return True
    except ValueError:
        return False


def _parse_forwarded_header(value: str | None) -> list[str]:
    if not value:
        return []

    candidates: list[str] = []
    for part in value.split(","):
        for item in part.split(";"):
            item = item.strip()
            if not item.lower().startswith("for="):
                continue
            raw_ip = item[4:].strip().strip('"')
            if raw_ip.startswith("[") and "]" in raw_ip:
                raw_ip = raw_ip[1:raw_ip.index("]")]
            elif ":" in raw_ip and raw_ip.count(":") == 1:
                raw_ip = raw_ip.split(":", 1)[0]
            if _is_valid_ip(raw_ip):
                candidates.append(raw_ip)
    return candidates


def extract_client_ip(request: Request) -> str:
    header_candidates: list[str] = []

    forwarded = _parse_forwarded_header(request.headers.get("forwarded"))
    if forwarded:
        header_candidates.extend(forwarded)

    x_forwarded_for = request.headers.get("x-forwarded-for")
    if x_forwarded_for:
        for part in x_forwarded_for.split(","):
            candidate = part.strip()
            if _is_valid_ip(candidate):
                header_candidates.append(candidate)

    for header_name in ("x-real-ip", "x-client-ip", "x-original-forwarded-for", "true-client-ip", "cf-connecting-ip"):
        candidate = request.headers.get(header_name)
        if candidate and _is_valid_ip(candidate.strip()):
            header_candidates.append(candidate.strip())

    for candidate in header_candidates:
        return candidate

    if request.client and request.client.host and _is_valid_ip(request.client.host):
        return request.client.host

    return "127.0.0.1"


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Process request
        response: Response = await call_next(request)

        # Only audit /api/ endpoints, ignore static assets or docs
        path = request.url.path
        if not path.startswith("/api/"):
            return response

        # Extract client IP
        client_ip = extract_client_ip(request)

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
