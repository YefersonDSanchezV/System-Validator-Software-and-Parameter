import logging
import pytz
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from app.core.sql_server import get_parametros_clinicos, update_parametro_historia_clinica, update_parametro_enfermeria
from app.core.database import SessionLocal
from app.models.solicitud_parametro import ConfiguracionParametros

logger = logging.getLogger(__name__)

TIMEZONE = pytz.timezone("America/Bogota")

_scheduler = None


def get_config_defaults():
    db = SessionLocal()
    try:
        conf = db.query(ConfiguracionParametros).first()
        if conf:
            return {
                "hc_default": conf.hc_default,
                "enf_hcrenf_default": conf.enf_hcrenf_default,
                "enf_haplmed_default": conf.enf_haplmed_default,
                "hora_restablecimiento": conf.hora_restablecimiento,
                "auto_restablecer": conf.auto_restablecer,
                "tipos_habilitados": conf.tipos_habilitados or ["Historia Clinica", "Enfermeria", "Otros"],
            }
    except Exception as e:
        logger.error(f"Error cargando configuracion de parametros: {e}")
    finally:
        db.close()
    return {
        "hc_default": 30,
        "enf_hcrenf_default": 48,
        "enf_haplmed_default": 48,
        "hora_restablecimiento": "20:05",
        "auto_restablecer": True,
        "tipos_habilitados": ["Historia Clinica", "Enfermeria", "Otros"],
    }


def check_and_reset_parameters():
    """Tarea programada: verifica y restablece parametros clinicos a sus valores por defecto."""
    import datetime
    now_col = datetime.datetime.now(TIMEZONE)
    logger.info(f"=== TAREA PROGRAMADA INICIADA === Hora Colombia: {now_col.strftime('%Y-%m-%d %H:%M:%S %Z')}")
    try:
        defaults = get_config_defaults()
        if not defaults["auto_restablecer"]:
            logger.info("Auto-restablecimiento desactivado en configuracion. Tarea omitida.")
            return

        parametros = get_parametros_clinicos()
        hc_val = int(parametros["historia_clinica"])
        enf_hcrenf = int(parametros["enfermeria_hcrenf"])
        enf_haplmed = int(parametros["enfermeria_haplmed"])

        hc_target = int(defaults["hc_default"])
        enf_crenf_target = int(defaults["enf_hcrenf_default"])
        enf_aplmed_target = int(defaults["enf_haplmed_default"])

        logger.info(
            f"Valores actuales en SQL Server -> HC: {hc_val}, ENF_CRENF: {enf_hcrenf}, ENF_APLMED: {enf_haplmed}"
        )
        logger.info(
            f"Valores objetivo (por defecto)  -> HC: {hc_target}, ENF_CRENF: {enf_crenf_target}, ENF_APLMED: {enf_aplmed_target}"
        )

        reset_done = False

        if hc_val != hc_target:
            logger.info(f"Restableciendo HCPDIAAUT: {hc_val} -> {hc_target}")
            update_parametro_historia_clinica(hc_target)
            reset_done = True
        else:
            logger.info(f"Historia Clinica ya en su valor por defecto ({hc_target}). Sin cambio.")

        if enf_hcrenf != enf_crenf_target or enf_haplmed != enf_aplmed_target:
            logger.info(
                f"Restableciendo Enfermeria: HCNMHRCRENF {enf_hcrenf}->{enf_crenf_target}, HCNHAPLMED {enf_haplmed}->{enf_aplmed_target}"
            )
            update_parametro_enfermeria(enf_crenf_target, enf_aplmed_target)
            reset_done = True
        else:
            logger.info(f"Enfermeria ya en sus valores por defecto ({enf_crenf_target}, {enf_aplmed_target}). Sin cambio.")

        if reset_done:
            logger.info("=== RESTABLECIMIENTO AUTOMATICO EJECUTADO CORRECTAMENTE ===")
        else:
            logger.info("=== Todos los parametros ya estaban en sus valores por defecto. Sin accion requerida. ===")

    except Exception as e:
        logger.error(f"Error en tarea programada check_and_reset_parameters: {e}", exc_info=True)


def reschedule_job(hora_str: str, auto_restablecer: bool = True):
    """Reprograma el job del scheduler con la nueva hora parametrizada (hora Colombia)."""
    global _scheduler
    if not _scheduler:
        logger.warning("Scheduler no inicializado. No se puede reprogramar.")
        return
    try:
        if _scheduler.get_job("reset_parametros_job"):
            _scheduler.remove_job("reset_parametros_job")

        if auto_restablecer:
            parts = hora_str.split(":")
            h = int(parts[0])
            m = int(parts[1]) if len(parts) > 1 else 0
            trigger = CronTrigger(hour=h, minute=m, timezone=TIMEZONE)
            _scheduler.add_job(check_and_reset_parameters, trigger, id="reset_parametros_job")
            logger.info(f"Tarea reprogramada a las {h:02d}:{m:02d} (hora Colombia / America/Bogota).")
        else:
            logger.info("Tarea de restablecimiento diario deshabilitada por configuracion.")
    except Exception as e:
        logger.error(f"Error reprogramando tarea: {e}", exc_info=True)


def get_scheduler_status():
    """Retorna el estado actual del scheduler y sus jobs para diagnóstico."""
    global _scheduler
    if not _scheduler:
        return {"running": False, "jobs": []}

    jobs = []
    for job in _scheduler.get_jobs():
        jobs.append({
            "id": job.id,
            "name": job.name,
            "next_run_utc": str(job.next_run_time) if job.next_run_time else None,
            "next_run_colombia": (
                job.next_run_time.astimezone(TIMEZONE).strftime("%Y-%m-%d %H:%M:%S %Z")
                if job.next_run_time else None
            ),
            "trigger": str(job.trigger),
        })
    return {"running": _scheduler.running, "jobs": jobs}


def init_scheduler():
    """Inicializa el BackgroundScheduler con timezone Colombia."""
    global _scheduler
    _scheduler = BackgroundScheduler(timezone=TIMEZONE)
    defaults = get_config_defaults()
    hora_str = defaults.get("hora_restablecimiento", "20:05")
    auto_restablecer = defaults.get("auto_restablecer", True)

    if auto_restablecer:
        try:
            parts = hora_str.split(":")
            h = int(parts[0])
            m = int(parts[1]) if len(parts) > 1 else 0
            trigger = CronTrigger(hour=h, minute=m, timezone=TIMEZONE)
            _scheduler.add_job(check_and_reset_parameters, trigger, id="reset_parametros_job")
            logger.info(f"Scheduler configurado: tarea diaria a las {h:02d}:{m:02d} hora Colombia (America/Bogota).")
        except Exception as e:
            logger.error(f"Error configurando trigger inicial: {e}", exc_info=True)
            # Fallback: 20:05 Colombia
            trigger = CronTrigger(hour=20, minute=5, timezone=TIMEZONE)
            _scheduler.add_job(check_and_reset_parameters, trigger, id="reset_parametros_job")
            logger.info("Scheduler configurado con hora de fallback: 20:05 hora Colombia.")
    else:
        logger.info("Auto-restablecimiento desactivado. Scheduler iniciado sin tareas programadas.")

    _scheduler.start()
    logger.info("Scheduler BackgroundScheduler iniciado correctamente.")
    return _scheduler
