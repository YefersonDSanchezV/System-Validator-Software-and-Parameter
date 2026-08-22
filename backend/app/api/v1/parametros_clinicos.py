from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from sqlalchemy.orm import Session
from datetime import datetime
from app.core.database import get_db
from app.models.solicitud_parametro import ConfiguracionParametros
from app.core.scheduler import reschedule_job, get_config_defaults, get_scheduler_status, check_and_reset_parameters
from app.core.sql_server import (
    get_parametros_clinicos,
    update_parametro_historia_clinica,
    update_parametro_enfermeria,
    get_paciente_por_ingreso
)
from app.utils.mailer import send_email
from app.services.solicitud_parametro_service import SolicitudParametroService
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/parametros-clinicos",
    tags=["Parámetros Clínicos"]
)

class ParametrosEstadoResponse(BaseModel):
    historia_clinica_abierto: bool
    historia_clinica_valor: int
    enfermeria_abierto: bool
    enfermeria_hcrenf: int
    enfermeria_haplmed: int

class HabilitarParametroRequest(BaseModel):
    tipo: str = Field(..., description="Enfermeria o Historia Clinica")
    hcpdiaaut: Optional[int] = None
    hcnmhcrenf: Optional[int] = None
    hcnhaplmed: Optional[int] = None
    observacion: str = Field(..., min_length=5)
    ingreso: Optional[str] = None # opcional para el mensaje

class ConfiguracionParametrosDTO(BaseModel):
    hc_default: int
    enf_hcrenf_default: int
    enf_haplmed_default: int
    hora_restablecimiento: str
    auto_restablecer: bool
    tipos_habilitados: List[str]
    correos_historia_clinica: Optional[str] = ""
    correos_enfermeria: Optional[str] = ""
    correos_otros: Optional[str] = ""

@router.get("/estado", response_model=ParametrosEstadoResponse)
def estado_parametros(db: Session = Depends(get_db)):
    try:
        conf = db.query(ConfiguracionParametros).first()
        hc_target = conf.hc_default if conf else 30
        enf_crenf_target = conf.enf_hcrenf_default if conf else 48
        enf_aplmed_target = conf.enf_haplmed_default if conf else 48

        parametros = get_parametros_clinicos()
        hc_val = parametros["historia_clinica"]
        enf_hcrenf = parametros["enfermeria_hcrenf"]
        enf_haplmed = parametros["enfermeria_haplmed"]

        return {
            "historia_clinica_abierto": hc_val != hc_target,
            "historia_clinica_valor": hc_val,
            "enfermeria_abierto": enf_hcrenf != enf_crenf_target or enf_haplmed != enf_aplmed_target,
            "enfermeria_hcrenf": enf_hcrenf,
            "enfermeria_haplmed": enf_haplmed
        }
    except Exception as e:
        logger.error(f"Error consultando parametros: {e}")
        raise HTTPException(status_code=500, detail="Error consultando la base de datos de parametros")

@router.get("/config", response_model=ConfiguracionParametrosDTO)
def get_config(db: Session = Depends(get_db)):
    conf = db.query(ConfiguracionParametros).first()
    if not conf:
        conf = ConfiguracionParametros(
            id=1,
            hc_default=30,
            enf_hcrenf_default=48,
            enf_haplmed_default=48,
            hora_restablecimiento="20:05",
            auto_restablecer=True,
            tipos_habilitados=["Historia Clinica", "Enfermeria", "Otros"],
            correos_historia_clinica="",
            correos_enfermeria="",
            correos_otros="",
            updated_at=datetime.utcnow()
        )
        db.add(conf)
        db.commit()
        db.refresh(conf)

    return {
        "hc_default": conf.hc_default,
        "enf_hcrenf_default": conf.enf_hcrenf_default,
        "enf_haplmed_default": conf.enf_haplmed_default,
        "hora_restablecimiento": conf.hora_restablecimiento,
        "auto_restablecer": conf.auto_restablecer,
        "tipos_habilitados": conf.tipos_habilitados or ["Historia Clinica", "Enfermeria", "Otros"],
        "correos_historia_clinica": conf.correos_historia_clinica or "",
        "correos_enfermeria": conf.correos_enfermeria or "",
        "correos_otros": conf.correos_otros or "",
    }

@router.put("/config", response_model=ConfiguracionParametrosDTO)
def update_config(data: ConfiguracionParametrosDTO, db: Session = Depends(get_db)):
    conf = db.query(ConfiguracionParametros).first()
    if not conf:
        conf = ConfiguracionParametros(id=1)
        db.add(conf)

    conf.hc_default = data.hc_default
    conf.enf_hcrenf_default = data.enf_hcrenf_default
    conf.enf_haplmed_default = data.enf_haplmed_default
    conf.hora_restablecimiento = data.hora_restablecimiento
    conf.auto_restablecer = data.auto_restablecer
    conf.tipos_habilitados = data.tipos_habilitados
    conf.correos_historia_clinica = data.correos_historia_clinica
    conf.correos_enfermeria = data.correos_enfermeria
    conf.correos_otros = data.correos_otros
    conf.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(conf)

    # Reprogram scheduler job
    reschedule_job(conf.hora_restablecimiento, conf.auto_restablecer)

    return {
        "hc_default": conf.hc_default,
        "enf_hcrenf_default": conf.enf_hcrenf_default,
        "enf_haplmed_default": conf.enf_haplmed_default,
        "hora_restablecimiento": conf.hora_restablecimiento,
        "auto_restablecer": conf.auto_restablecer,
        "tipos_habilitados": conf.tipos_habilitados,
        "correos_historia_clinica": conf.correos_historia_clinica or "",
        "correos_enfermeria": conf.correos_enfermeria or "",
        "correos_otros": conf.correos_otros or "",
    }

@router.post("/restablecer-defecto")
def restablecer_parametros_defecto(db: Session = Depends(get_db)):
    try:
        conf = db.query(ConfiguracionParametros).first()
        hc_target = conf.hc_default if conf else 30
        enf_crenf_target = conf.enf_hcrenf_default if conf else 48
        enf_aplmed_target = conf.enf_haplmed_default if conf else 48

        update_parametro_historia_clinica(hc_target)
        update_parametro_enfermeria(enf_crenf_target, enf_aplmed_target)

        # Notify
        try:
            recipients = list(set(
                SolicitudParametroService._obtener_destinatarios(db, "Historia Clinica") +
                SolicitudParametroService._obtener_destinatarios(db, "Enfermeria")
            ))
            if recipients:
                body = (
                    "Se han restablecido los parámetros clínicos a sus valores por defecto manualmente desde el sistema.\n\n"
                    f"Historia Clínica (HCPDIAAUT): {hc_target}\n"
                    f"Enfermería (HCNMHRCRENF): {enf_crenf_target}\n"
                    f"Enfermería (HCNHAPLMED): {enf_aplmed_target}\n"
                    "Estado: Parámetros Cerrados / Por Defecto\n"
                )
                send_email(
                    subject="Parámetros Clínicos Restablecidos a Valores Por Defecto",
                    body=body,
                    recipients=recipients
                )
        except Exception as exc:
            logger.warning(f"No se pudo enviar notificación por correo al restablecer: {exc}")

        return {
            "message": "Parámetros restablecidos correctamente a sus valores por defecto",
            "historia_clinica": hc_target,
            "enfermeria_hcrenf": enf_crenf_target,
            "enfermeria_haplmed": enf_aplmed_target
        }
    except Exception as e:
        logger.error(f"Error restableciendo parametros a por defecto: {e}")
        raise HTTPException(status_code=500, detail="Error restableciendo los parámetros")

@router.get("/tipos", response_model=List[str])
def get_tipos_habilitados(db: Session = Depends(get_db)):
    conf = db.query(ConfiguracionParametros).first()
    if conf and conf.tipos_habilitados:
        return conf.tipos_habilitados
    return ["Historia Clinica", "Enfermeria", "Otros"]

@router.post("/habilitar")
def habilitar_parametro(req: HabilitarParametroRequest, db: Session = Depends(get_db)):
    try:
        tipo = req.tipo.strip().lower()
        
        info_paciente = ""
        if req.ingreso:
            paciente = get_paciente_por_ingreso(req.ingreso)
            if paciente:
                info_paciente = f"\nPaciente: {paciente['nombre_completo']} - Ingreso: {req.ingreso}"
                
        if tipo == "historia clinica":
            if req.hcpdiaaut is None:
                raise HTTPException(status_code=400, detail="Valor hcpdiaaut es requerido para Historia Clinica")
            update_parametro_historia_clinica(req.hcpdiaaut)
            estado_msg = f"Habilitado con el valor {req.hcpdiaaut}"
        elif tipo == "enfermeria":
            if req.hcnmhcrenf is None or req.hcnhaplmed is None:
                raise HTTPException(status_code=400, detail="Valores hcnmhcrenf y hcnhaplmed son requeridos para Enfermeria")
            update_parametro_enfermeria(req.hcnmhcrenf, req.hcnhaplmed)
            estado_msg = f"Habilitado con los valores HCNMHRCRENF={req.hcnmhcrenf}, HCNHAPLMED={req.hcnhaplmed}"
        elif tipo == "otros":
            estado_msg = "Habilitado / Registrado según observación"
        else:
            raise HTTPException(status_code=400, detail="Tipo de parametro invalido")

        # Send email
        recipients = SolicitudParametroService._obtener_destinatarios(db, req.tipo)
        if recipients:
            body = (
                f"Se ha actualizado un parametro clinico.\n\n"
                f"Tipo: {req.tipo}\n"
                f"Observacion: {req.observacion}\n"
                f"Estado: {estado_msg}\n"
                f"{info_paciente}"
            )
            try:
                send_email(
                    subject=f"Parametro Clinico Actualizado - {req.tipo}",
                    body=body,
                    recipients=recipients
                )
            except Exception as e:
                logger.warning(f"No se pudo enviar notificacion por correo: {e}")

        return {"message": "Parametro actualizado correctamente"}
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error actualizando parametro: {e}")
        raise HTTPException(status_code=500, detail="Error actualizando el parametro")


@router.get("/scheduler/status")
def scheduler_status():
    """Diagnóstico del scheduler: muestra estado actual, jobs programados y próxima ejecución."""
    try:
        import datetime
        import pytz
        tz = pytz.timezone("America/Bogota")
        now_col = datetime.datetime.now(tz)
        status = get_scheduler_status()
        return {
            "hora_servidor_colombia": now_col.strftime("%Y-%m-%d %H:%M:%S %Z"),
            **status
        }
    except Exception as e:
        logger.error(f"Error obteniendo estado del scheduler: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/scheduler/ejecutar-ahora")
def scheduler_ejecutar_ahora():
    """Ejecuta manualmente la tarea de restablecimiento de parámetros para pruebas."""
    try:
        import datetime
        import pytz
        tz = pytz.timezone("America/Bogota")
        now_col = datetime.datetime.now(tz)
        logger.info(f"Ejecucion manual del scheduler solicitada a las {now_col.strftime('%H:%M:%S %Z')}")
        check_and_reset_parameters()
        return {
            "message": "Tarea de restablecimiento ejecutada manualmente.",
            "ejecutado_a": now_col.strftime("%Y-%m-%d %H:%M:%S %Z")
        }
    except Exception as e:
        logger.error(f"Error en ejecucion manual del scheduler: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
