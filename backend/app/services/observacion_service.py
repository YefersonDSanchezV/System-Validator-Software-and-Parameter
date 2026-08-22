import json
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.regvalidacion import RegValidacion
from app.models.regversion import RegVersion
from app.models.regaprobado import RegAprobado
from app.models.regrechazado import RegRechazado
from app.repositories.observacion_repository import ObservacionRepository
from app.schemas.validacion import ObservacionCreate


def _parse_captura(value: str) -> list[str]:
    """Parse captura field: new records store JSON array, old ones a bare base64 string."""
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, list) else [value]
    except (json.JSONDecodeError, ValueError):
        return [value]

MAP_FRONTEND_TO_DB_MODULO = {
    "ADMISIONES": "ADMISIONES",
    "CARTERA": "CARTERA",
    "CONTABILIDAD": "CONTABILIDAD",
    "CONTRATOS_IPS": "CONTRATOS_IPS",
    "FACTURACION": "FACTURACION",
    "HOSPITALIZACION": "HOSPITALIZACION",
    "INVENTARIOS": "INVENTARIOS",
    "PAGOS": "PAGOS",
    "TESORERIA": "TESORERIA",
    "GENERALES_SEGURIDAD": "GENERALES_SEGURIDAD",
    "CITAS_MEDICAS": "CITAS_MEDICAS",
    "HISTORIAS_CLINICAS": "HISTORIAS_CLINICAS",
    "ACTIVOS_FIJOS": "ACTIVOS_FIJOS",
    "NOMINA": "NOMINA",
    "INFORMACION_FINANCIERA_NIIF": "INFORMACION_FINANCIERA_NIIF",
    "GESTION_GERENCIAL": "GESTION_GERENCIAL",
    "WEB_CITAS_MEDICAS": "WEB_CITAS_MEDICAS",
    "PROGRAMACION_DE_CIRUGIAS": "PROGRAMACION_DE_CIRUGIAS",
    "OTROS": "OTROS"
}

MAP_DB_TO_FRONTEND_MODULO = {v: k for k, v in MAP_FRONTEND_TO_DB_MODULO.items()}


class ObservacionService:

    def __init__(self):
        self.repository = ObservacionRepository()

    def listar(self, db: Session):
        res = []

        # 1. Get approvals
        aprobados = self.repository.get_all_aprobados(db)
        for ap in aprobados:
            v_id = ap.validacion.version_id if ap.validacion else 0
            if ap.validacion and ap.validacion.version:
                ver = ap.validacion.version
                v_titulo = f"{ver.titulo} - {ver.num_compilacion}" if ver.num_compilacion else ver.titulo
            else:
                v_titulo = f"Versión {v_id}"
            mod = ap.validacion.modulo.value if (ap.validacion and ap.validacion.modulo) else "OTROS"
            ruta = ap.validacion.ruta if ap.validacion else None

            # Map back to frontend module name
            mod_fe = MAP_DB_TO_FRONTEND_MODULO.get(mod, mod)

            res.append({
                "id": f"o_ap_{ap.oid}",
                "versionId": f"v{v_id}",
                "versionTitulo": v_titulo,
                "modulo": mod_fe,
                "nombre": ap.nombre_registra,
                "cargo": ap.cargo,
                "fechaHora": ap.fecha_registro.strftime("%Y-%m-%d %H:%M") if ap.fecha_registro else "",
                "estado": "aprobacion",
                "observacion": ap.observacion,
                "firma": ap.firma.firma if ap.firma else None
            })

        # 2. Get rejections
        rechazados = self.repository.get_all_rechazados(db)
        for re in rechazados:
            v_id = re.validacion.version_id if re.validacion else 0
            if re.validacion and re.validacion.version:
                ver = re.validacion.version
                v_titulo = f"{ver.titulo} - {ver.num_compilacion}" if ver.num_compilacion else ver.titulo
            else:
                v_titulo = f"Versión {v_id}"
            mod = re.validacion.modulo.value if (re.validacion and re.validacion.modulo) else "OTROS"
            ruta_val = re.ruta or (re.validacion.ruta if re.validacion else None)

            # Map back to frontend module name
            mod_fe = MAP_DB_TO_FRONTEND_MODULO.get(mod, mod)

            res.append({
                "id": f"o_re_{re.oid}",
                "versionId": f"v{v_id}",
                "versionTitulo": v_titulo,
                "modulo": mod_fe,
                "nombre": re.nombre_registra,
                "cargo": re.cargo,
                "fechaHora": re.fecha_registro.strftime("%Y-%m-%d %H:%M") if re.fecha_registro else "",
                "estado": "rechazo",
                "observacion": re.observacion,
                "incidencia": re.incidencia,
                "ruta": ruta_val,
                "firma": re.firma.firma if re.firma else None,
                "captura": _parse_captura(re.captura.firma) if re.captura else None
            })

        # Sort latest first
        res.sort(key=lambda x: x["fechaHora"], reverse=True)
        return res

    def listar_por_version(self, db: Session, version_id: int):
        res = []

        # 1. Get approvals for this version
        aprobados = self.repository.get_all_aprobados(db)
        for ap in aprobados:
            v_id = ap.validacion.version_id if ap.validacion else 0
            if v_id != version_id:
                continue

            mod = ap.validacion.modulo.value if (ap.validacion and ap.validacion.modulo) else "OTROS"
            ruta = ap.validacion.ruta if ap.validacion else None

            # Map back to frontend module name
            mod_fe = MAP_DB_TO_FRONTEND_MODULO.get(mod, mod)

            res.append({
                "id": f"o_ap_{ap.oid}",
                "versionId": f"v{v_id}",
                "modulo": mod_fe,
                "nombre": ap.nombre_registra,
                "cargo": ap.cargo,
                "fechaHora": ap.fecha_registro.strftime("%Y-%m-%d %H:%M") if ap.fecha_registro else "",
                "estado": "aprobacion",
                "observacion": ap.observacion,
                "firma": ap.firma.firma if ap.firma else None
            })

        # 2. Get rejections for this version
        rechazados = self.repository.get_all_rechazados(db)
        for re in rechazados:
            v_id = re.validacion.version_id if re.validacion else 0
            if v_id != version_id:
                continue

            mod = re.validacion.modulo.value if (re.validacion and re.validacion.modulo) else "OTROS"
            ruta_val = re.ruta or (re.validacion.ruta if re.validacion else None)

            # Map back to frontend module name
            mod_fe = MAP_DB_TO_FRONTEND_MODULO.get(mod, mod)

            res.append({
                "id": f"o_re_{re.oid}",
                "versionId": f"v{v_id}",
                "modulo": mod_fe,
                "nombre": re.nombre_registra,
                "cargo": re.cargo,
                "fechaHora": re.fecha_registro.strftime("%Y-%m-%d %H:%M") if re.fecha_registro else "",
                "estado": "rechazo",
                "observacion": re.observacion,
                "incidencia": re.incidencia,
                "ruta": ruta_val,
                "firma": re.firma.firma if re.firma else None,
                "captura": _parse_captura(re.captura.firma) if re.captura else None
            })

        # Sort latest first
        res.sort(key=lambda x: x["fechaHora"], reverse=True)
        return res

    def crear(self, db: Session, data: ObservacionCreate):
        try:
            if data.estado not in {"aprobacion", "rechazo"}:
                raise ValueError("El estado debe ser 'aprobacion' o 'rechazo'")

            if not data.observacion.strip() or not data.nombre.strip():
                raise ValueError("La observación y el nombre son obligatorios")

            if not db.get(RegVersion, data.version_id):
                raise ValueError("La versión indicada no existe")

            # Map frontend module to DB modulo
            modulo_input = data.modulo
            if modulo_input in MAP_FRONTEND_TO_DB_MODULO:
                db_modulo = MAP_FRONTEND_TO_DB_MODULO[modulo_input]
                db_ruta = data.ruta
            else:
                db_modulo = "OTROS"
                db_ruta = modulo_input  # The custom module name is the route

            # 1. Create Firma
            firma_content = data.firma or ""
            firma_obj = self.repository.create_firma(db, firma_content)

            # 2. Create RegValidacion
            validacion = RegValidacion(
                version_id=data.version_id,
                modulo=db_modulo,
                ruta=db_ruta
            )
            val_obj = self.repository.create_validacion(db, validacion)

            # 3. Create approved or rejected record
            captura_b64 = None
            if data.estado == "aprobacion":
                aprobado = RegAprobado(
                    regvalidacion_id=val_obj.oid,
                    observacion=data.observacion,
                    nombre_registra=data.nombre,
                    cargo=data.cargo,
                    firma_id=firma_obj.oid,
                    fecha_registro=datetime.now()
                )
                obs_obj = self.repository.create_aprobado(db, aprobado)
                obs_id = f"o_ap_{obs_obj.oid}"
                fecha_str = aprobado.fecha_registro.strftime("%Y-%m-%d %H:%M")
            else:
                # Handle optional captura image
                captura_obj = None
                if getattr(data, "captura", None):
                    captura_obj = self.repository.create_firma(db, json.dumps(data.captura))
                rechazado = RegRechazado(
                    regvalidacion_id=val_obj.oid,
                    incidencia=data.incidencia,
                    ruta=data.ruta,
                    observacion=data.observacion,
                    nombre_registra=data.nombre,
                    cargo=data.cargo,
                    firma_id=firma_obj.oid,
                    captura_id=captura_obj.oid if captura_obj else None,
                    fecha_registro=datetime.now()
                )
                obs_obj = self.repository.create_rechazado(db, rechazado)
                # Refresh to load the captura relationship before commit
                db.refresh(obs_obj)
                obs_id = f"o_re_{obs_obj.oid}"
                fecha_str = rechazado.fecha_registro.strftime("%Y-%m-%d %H:%M")
                captura_b64 = data.captura  # use the input data directly for the response

            self.repository.commit_transaction(db)

            return {
                "id": obs_id,
                "versionId": f"v{data.version_id}",
                "modulo": data.modulo,
                "nombre": data.nombre,
                "cargo": data.cargo,
                "fechaHora": fecha_str,
                "estado": data.estado,
                "observacion": data.observacion,
                "incidencia": data.incidencia,
                "ruta": data.ruta,
                "firma": data.firma,
                "captura": data.captura if data.estado == "rechazo" else None
            }
        except Exception:
            db.rollback()
            raise
