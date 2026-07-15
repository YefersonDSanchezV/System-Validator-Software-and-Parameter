import sys
import os
from datetime import datetime

# Append project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.core.database import SessionLocal
from app.models.regversion import RegVersion
from app.models.regvalidacion import RegValidacion
from app.models.firmas import Firma
from app.models.regaprobado import RegAprobado
from app.models.regrechazado import RegRechazado
from app.models.boletines import Boletin
from app.models.manuales_usuario import ManualUsuario


def seed_db():
    db = SessionLocal()
    try:
        # Clear existing data to avoid PK conflicts or dirty state
        db.query(RegRechazado).delete()
        db.query(RegAprobado).delete()
        db.query(RegValidacion).delete()
        db.query(RegVersion).delete()
        db.query(Firma).delete()
        db.query(Boletin).delete()
        db.query(ManualUsuario).delete()
        db.commit()

        # 1. Seed Versions
        print("Seeding versions...")
        v1 = RegVersion(
            titulo="Versión 4.2.1 — Actualización General",
            descripcion="Mejoras en módulo de facturación, corrección de bugs en cartera y optimización de consultas en historias clínicas. Se implementaron nuevas validaciones en el proceso de cierre contable mensual.",
            enlace="https://pruebas.sistema.com/v4.2.1",
            fecha_registro=datetime(2026, 6, 15),
            estado=False,  # inactive
            usuario="Sistemas"
        )
        v2 = RegVersion(
            titulo="Versión 4.3.0 — Módulo NIIF",
            descripcion="Implementación completa del módulo de Información Financiera NIIF, integración con informes gerenciales y nuevas vistas en tesorería. Mejora en el rendimiento de consultas de alto volumen.",
            enlace="https://pruebas.sistema.com/v4.3.0",
            fecha_registro=datetime(2026, 7, 1),
            estado=True,  # active
            usuario="Sistemas"
        )
        v3 = RegVersion(
            titulo="Versión 4.3.1 — Parche de Seguridad",
            descripcion="Correcciones críticas de seguridad en autenticación, permisos de usuario y cifrado de datos sensibles del paciente conforme a normativa de habeas data.",
            enlace="https://pruebas.sistema.com/v4.3.1",
            fecha_registro=datetime(2026, 7, 5),
            estado=True,  # active
            usuario="Sistemas"
        )
        db.add_all([v1, v2, v3])
        db.commit()
        print("Versions seeded successfully.")

        # Let's get version IDs from database
        versions_list = db.query(RegVersion).order_by(RegVersion.oid).all()
        v1_id = versions_list[0].oid
        v2_id = versions_list[1].oid
        v3_id = versions_list[2].oid

        # 2. Seed Observations
        print("Seeding observations...")

        # Dummy base64 signature
        dummy_firma = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

        f1 = Firma(firma=dummy_firma)
        f2 = Firma(firma=dummy_firma)
        f3 = Firma(firma=dummy_firma)
        f4 = Firma(firma=dummy_firma)
        f5 = Firma(firma=dummy_firma)
        f6 = Firma(firma=dummy_firma)
        db.add_all([f1, f2, f3, f4, f5, f6])
        db.flush()

        # Observacion 1: v2, FACTURACION, María González, aprobacion
        val1 = RegValidacion(version_id=v2_id, modulo="FACTURACION")
        db.add(val1)
        db.flush()
        ap1 = RegAprobado(
            regvalidacion_id=val1.oid,
            observacion="Módulo de facturación funciona correctamente. Todas las pruebas de factura electrónica pasaron satisfactoriamente.",
            nombre_registra="María González",
            firma_id=f1.oid,
            fecha_registro=datetime(2026, 7, 3, 9, 15)
        )
        db.add(ap1)

        # Observacion 2: v2, CARTERA, Carlos Rodríguez, rechazo
        val2 = RegValidacion(version_id=v2_id, modulo="CARTERA", ruta="Módulo Cartera > Reportes > Cartera Vencida")
        db.add(val2)
        db.flush()
        re2 = RegRechazado(
            regvalidacion_id=val2.oid,
            incidencia="INC-2024-089",
            ruta="Módulo Cartera > Reportes > Cartera Vencida",
            observacion="Error al generar reportes de cartera vencida con filtro por fecha.",
            nombre_registra="Carlos Rodríguez",
            firma_id=f2.oid,
            fecha_registro=datetime(2026, 7, 3, 10, 30)
        )
        db.add(re2)

        # Observacion 3: v2, FACTURACION, Ana Martínez, aprobacion
        val3 = RegValidacion(version_id=v2_id, modulo="FACTURACION")
        db.add(val3)
        db.flush()
        ap3 = RegAprobado(
            regvalidacion_id=val3.oid,
            observacion="Segunda revisión completada. Sin novedades adicionales.",
            nombre_registra="Ana Martínez",
            firma_id=f3.oid,
            fecha_registro=datetime(2026, 7, 4, 8, 0)
        )
        db.add(ap3)

        # Observacion 4: v2, CONTABILIDAD, Jorge López, aprobacion
        val4 = RegValidacion(version_id=v2_id, modulo="CONTABILIDAD")
        db.add(val4)
        db.flush()
        ap4 = RegAprobado(
            regvalidacion_id=val4.oid,
            observacion="Módulo contable revisado y aprobado. Cierres mensuales funcionan correctamente.",
            nombre_registra="Jorge López",
            firma_id=f4.oid,
            fecha_registro=datetime(2026, 7, 4, 11, 20)
        )
        db.add(ap4)

        # Observacion 5: v2, NOMINA, Luisa Pérez, rechazo
        val5 = RegValidacion(version_id=v2_id, modulo="NOMINA", ruta="Nómina > Liquidaciones > Prestaciones Sociales")
        db.add(val5)
        db.flush()
        re5 = RegRechazado(
            regvalidacion_id=val5.oid,
            incidencia="INC-2024-092",
            ruta="Nómina > Liquidaciones > Prestaciones Sociales",
            observacion="Falla en liquidación de prestaciones sociales para contratos de medio tiempo.",
            nombre_registra="Luisa Pérez",
            firma_id=f5.oid,
            fecha_registro=datetime(2026, 7, 5, 14, 0)
        )
        db.add(re5)

        # Observacion 6: v3, GENERALES_SEGURIDAD, Roberto Silva, aprobacion
        val6 = RegValidacion(version_id=v3_id, modulo="GENERALES_SEGURIDAD")
        db.add(val6)
        db.flush()
        ap6 = RegAprobado(
            regvalidacion_id=val6.oid,
            observacion="Módulo de seguridad validado. Nuevas políticas de contraseña funcionan correctamente.",
            nombre_registra="Roberto Silva",
            firma_id=f6.oid,
            fecha_registro=datetime(2026, 7, 6, 9, 0)
        )
        db.add(ap6)

        db.commit()
        print("Observations seeded successfully.")

        # 3. Seed Bulletins
        print("Seeding bulletins...")
        b1 = Boletin(
            tipo_documento="Técnico",
            consecutivo=24,
            fecha=datetime(2026, 7, 1),
            asunto="Boletín Técnico #24 — Actualización Módulo NIIF 2026",
            instructivo_descripcion="Cambios en estándares NIIF para el período 2026 y su impacto en el módulo de información financiera y reportes gerenciales.",
            con_documentacion=True,
            fecha_registro=datetime.now()
        )
        b2 = Boletin(
            tipo_documento="Funcional",
            consecutivo=23,
            fecha=datetime(2026, 6, 15),
            asunto="Boletín #23 — Nuevas Funcionalidades Q2 2026",
            instructivo_descripcion="Resumen de las mejoras implementadas durante el segundo trimestre de 2026, incluyendo optimizaciones en facturación y cartera.",
            con_documentacion=True,
            fecha_registro=datetime.now()
        )
        b3 = Boletin(
            tipo_documento="Seguridad",
            consecutivo=7,
            fecha=datetime(2026, 5, 20),
            asunto="Boletín de Seguridad #07 — Políticas de Acceso",
            instructivo_descripcion="Actualización de políticas de contraseñas, doble factor de autenticación y control de acceso por roles.",
            con_documentacion=True,
            fecha_registro=datetime.now()
        )
        b4 = Boletin(
            tipo_documento="Funcional",
            consecutivo=22,
            fecha=datetime(2026, 4, 10),
            asunto="Boletín #22 — Integración Web Citas Médicas",
            instructivo_descripcion="Nuevas funcionalidades del módulo web de citas médicas: confirmación automática, recordatorios por SMS y cancelación en línea.",
            con_documentacion=True,
            fecha_registro=datetime.now()
        )
        db.add_all([b1, b2, b3, b4])
        db.commit()
        print("Bulletins seeded successfully.")

        # 4. Seed Manuals
        print("Seeding manuals...")
        m1 = ManualUsuario(modulo="FACTURACION", titulo="Manual de Usuario — Módulo Facturación v4.3", version="4.3", fecha_registro=datetime(2026, 6, 20))
        m2 = ManualUsuario(modulo="CONTABILIDAD", titulo="Manual de Usuario — Módulo Contable v4.3", version="4.3", fecha_registro=datetime(2026, 6, 20))
        m3 = ManualUsuario(modulo="CARTERA", titulo="Manual de Usuario — Cartera y Cobranzas v4.2", version="4.2", fecha_registro=datetime(2026, 5, 15))
        m4 = ManualUsuario(modulo="NOMINA", titulo="Manual de Usuario — Nómina y RRHH v4.2", version="4.2", fecha_registro=datetime(2026, 5, 15))
        m5 = ManualUsuario(modulo="INFORMACION_FINANCIERA_NIIF", titulo="Manual de Usuario — Módulo NIIF v4.3", version="4.3", fecha_registro=datetime(2026, 7, 1))
        m6 = ManualUsuario(modulo="HISTORIAS_CLINICAS", titulo="Manual de Usuario — Historias Clínicas v4.2", version="4.2", fecha_registro=datetime(2026, 5, 15))
        m7 = ManualUsuario(modulo="CITAS_MEDICAS", titulo="Manual de Usuario — Citas Médicas v4.2", version="4.2", fecha_registro=datetime(2026, 4, 10))

        db.add_all([m1, m2, m3, m4, m5, m6, m7])
        db.commit()
        print("Manuals seeded successfully.")

    except Exception as e:
        print("Error during seed:", e)
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_db()
