import logging
import json
import socket
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
from ipaddress import ip_address, IPv4Address, IPv6Address
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.database import SessionLocal
from app.models.auditoria import AuditLog

logger = logging.getLogger(__name__)
_AUDIT_EXECUTOR = ThreadPoolExecutor(max_workers=2, thread_name_prefix="audit-log-writer")
_REVERSE_DNS_EXECUTOR = ThreadPoolExecutor(max_workers=1, thread_name_prefix="audit-reverse-dns")
_HOSTNAME_CACHE: dict[str, str] = {}


def detect_modulo(path: str) -> str:
    path_lower = path.lower()
    if "/uploads/manuales" in path_lower:
        return "Manuales de Usuario"
    if "/uploads/boletines" in path_lower:
        return "Boletines"
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


def _normalize_ip(value: str) -> str:
    candidate = value.strip().strip('"').strip("'")
    if candidate.startswith("[") and "]" in candidate:
        candidate = candidate[1:candidate.index("]")]
    if ":" in candidate and candidate.count(":") == 1:
        possible_ip, possible_port = candidate.split(":", 1)
        if possible_port.isdigit() and _is_valid_ip(possible_ip):
            candidate = possible_ip
    return candidate


def _append_header_ip_candidates(raw_value: str | None, target: list[str]) -> None:
    if not raw_value:
        return
    for part in raw_value.split(","):
        normalized = _normalize_ip(part)
        if _is_valid_ip(normalized):
            target.append(normalized)


def _is_private_client_ip(value: str) -> bool:
    parsed = ip_address(value)
    return parsed.is_private and not parsed.is_loopback and not parsed.is_link_local


def _ip_priority(value: str) -> int:
    parsed = ip_address(value)

    if parsed.is_loopback or parsed.is_link_local:
        return 1
    if parsed.is_private:
        if isinstance(parsed, IPv4Address):
            octets = value.split(".")
            if len(octets) == 4 and octets[0] == "192" and octets[1] == "168":
                return 6
            if len(octets) == 4 and octets[0] == "10":
                return 5
            if len(octets) == 4 and octets[0] == "172":
                return 4
        if isinstance(parsed, IPv6Address):
            return 3
        return 2
    return 7


def _parse_forwarded_header(value: str | None) -> list[str]:
    if not value:
        return []

    candidates: list[str] = []
    for part in value.split(","):
        for item in part.split(";"):
            item = item.strip()
            if not item.lower().startswith("for="):
                continue
            raw_ip = _normalize_ip(item[4:].strip())
            if _is_valid_ip(raw_ip):
                candidates.append(raw_ip)
    return candidates


def extract_client_ip(request: Request) -> str:
    header_candidates: list[str] = []

    forwarded = _parse_forwarded_header(request.headers.get("forwarded"))
    if forwarded:
        header_candidates.extend(forwarded)

    _append_header_ip_candidates(request.headers.get("x-forwarded-for"), header_candidates)

    for header_name in ("x-real-ip", "x-client-ip", "x-original-forwarded-for", "true-client-ip", "cf-connecting-ip"):
        _append_header_ip_candidates(request.headers.get(header_name), header_candidates)

    if request.client and request.client.host and _is_valid_ip(request.client.host):
        header_candidates.append(request.client.host)

    deduped_candidates: list[str] = []
    seen = set()
    for candidate in header_candidates:
        if candidate in seen:
            continue
        seen.add(candidate)
        deduped_candidates.append(candidate)

    private_candidates = [ip for ip in deduped_candidates if _is_private_client_ip(ip)]
    if private_candidates:
        return max(private_candidates, key=_ip_priority)
    if deduped_candidates:
        return max(deduped_candidates, key=_ip_priority)

    return "127.0.0.1"


def resolve_host_name(client_ip: str) -> str:
    cached = _HOSTNAME_CACHE.get(client_ip)
    if cached:
        return cached
    try:
        future = _REVERSE_DNS_EXECUTOR.submit(socket.gethostbyaddr, client_ip)
        host_name, _, _ = future.result(timeout=0.25)
        resolved = host_name.strip()
        if resolved:
            _HOSTNAME_CACHE[client_ip] = resolved
            return resolved
    except FuturesTimeoutError:
        logger.debug("Timeout resolviendo hostname para IP %s", client_ip)
    except Exception:
        pass
    _HOSTNAME_CACHE[client_ip] = "No disponible"
    return "No disponible"


def resolve_client_host_name(request: Request, client_ip: str) -> str:
    for header_name in ("x-client-hostname", "x-forwarded-hostname", "x-computer-name", "x-machine-name"):
        header_value = request.headers.get(header_name, "").strip()
        if header_value:
            return header_value
    parsed_ip = ip_address(client_ip)
    if parsed_ip.is_loopback or parsed_ip.is_link_local:
        return "No disponible"
    return resolve_host_name(client_ip)


def extract_windows_user(request: Request, fallback_user: str) -> str:
    header_candidates = (
        "x-windows-user",
        "x-remote-user",
        "remote-user",
        "x-authenticated-user",
        "x-ms-client-principal-name",
        "x-logon-user",
    )
    for header_name in header_candidates:
        value = request.headers.get(header_name, "").strip()
        if value:
            return value.split("\\")[-1]
    return fallback_user


def persist_log_entry(
    method: str,
    client_ip: str,
    host_name: str,
    windows_user: str,
    modulo: str,
    submodulo: str,
    user: str,
    detalle: str,
    payload_json: dict,
) -> None:
    try:
        db = SessionLocal()
        try:
            log_entry = AuditLog(
                tipo_accion=method,
                ip_equipo=client_ip,
                nombre_equipo=host_name,
                usuario_windows_equipo=windows_user,
                modulo=modulo,
                submodulo=submodulo,
                usuario=user,
                detalle=detalle,
                payload_json=json.dumps(payload_json, ensure_ascii=False),
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


def resolve_submodulo(path: str, method: str, response: Response) -> str:
    path_lower = path.lower()
    content_disposition = response.headers.get("content-disposition", "").lower()
    is_download_path = (
        "/pdf" in path_lower
        or "/exportar-excel" in path_lower
        or "/uploads/" in path_lower
        or "attachment" in content_disposition
    )
    if is_download_path:
        return "LOGS_DESCARGAS"
    if method == "GET":
        return "LOGS_ACCESOS"
    return "LOGS_SISTEMAS"


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        payload_body = None
        content_type = request.headers.get("content-type", "").lower()
        should_capture_body = request.method.upper() in {"POST", "PUT", "PATCH"} and "application/json" in content_type
        if should_capture_body:
            body_raw = await request.body()
            body_text = body_raw.decode("utf-8", errors="ignore").strip() if body_raw else ""
            if body_text:
                try:
                    payload_body = json.loads(body_text)
                except json.JSONDecodeError:
                    payload_body = body_text

        # Process request
        response: Response = await call_next(request)

        # Only audit API and uploaded-file access routes
        path = request.url.path
        if not path.startswith("/api/") and not path.startswith("/uploads/"):
            return response

        # Extract client IP
        client_ip = extract_client_ip(request)
        client_private_ip = request.headers.get("x-client-private-ip", "").strip()
        if client_private_ip and _is_valid_ip(client_private_ip):
            client_ip = client_private_ip
        host_name = resolve_client_host_name(request, client_ip)

        # Extract user
        user = request.headers.get("x-user-role") or request.headers.get("x-user-name")
        if not user:
            user = "Coordinador de Sistemas" if "coordinator" in request.headers.get("referer", "").lower() else "Usuario Sistema"
        windows_user = extract_windows_user(request, user)

        method = request.method.upper()
        modulo = detect_modulo(path)
        status_code = response.status_code
        submodulo = resolve_submodulo(path, method, response)

        # Summary detail
        detalle = f"{method} {path} - Status: {status_code}"
        payload_json = {
            "method": method,
            "path": path,
            "status": status_code,
            "ip_equipo": client_ip,
            "nombre_equipo": host_name,
            "usuario_windows_equipo": windows_user,
            "usuario_aplicacion": user,
            "query_params": dict(request.query_params),
            "body": payload_body,
        }

        # Persist asynchronously to avoid slowing the response path.
        _AUDIT_EXECUTOR.submit(
            persist_log_entry,
            method,
            client_ip,
            host_name,
            windows_user,
            modulo,
            submodulo,
            user,
            detalle,
            payload_json,
        )

        return response
