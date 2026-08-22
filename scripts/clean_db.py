#!/usr/bin/env python3
"""
Script de limpieza selectiva de base de datos PostgreSQL.

Este script elimina la información de:
  1. Solicitudes de Parámetros (tabla: solicitud_parametro)
  2. Solicitudes de Manuales (tabla: solicitudes_manuales)
  3. Logs de Auditoría (tabla: audit_logs)
    4. Manuales de Usuario (tabla: manuales_usuarios)

CONSERVA intacta la información de:
  - Versiones (versiones)
  - Detalles de Versiones / Observaciones (observaciones)
  - Restauraciones de BD (restauraciones_db)
    - Boletines
  - Configuración de Parámetros
"""

import sys
import os
import psycopg2

DB_HOST = os.getenv("DB_HOST", "192.168.3.121")
DB_PORT = int(os.getenv("DB_PORT", "5432"))
DB_NAME = os.getenv("DB_NAME", "softwarevalidation")
DB_USER = os.getenv("DB_USER", "sistemasicvc")
DB_PASSWORD = os.getenv("DB_PASSWORD", "icvc2024")

def clean_database():
    print(f"Conectando a PostgreSQL en {DB_HOST}:{DB_PORT}/{DB_NAME} como {DB_USER}...")
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            connect_timeout=10
        )
        cursor = conn.cursor()

        tables_to_truncate = [
            "solicitud_parametro",
            "solicitudes_manuales",
            "audit_logs",
            "manuales_usuarios",
        ]

        print("\n--- Ejecutando Limpieza de Tablas Seleccionadas ---")
        for table in tables_to_truncate:
            try:
                cursor.execute(f"TRUNCATE TABLE {table} CASCADE;")
                print(f"  [OK] Registros eliminados de la tabla: {table}")
            except Exception as e:
                print(f"  [ERROR] No se pudo limpiar la tabla {table}: {e}")
                conn.rollback()

        conn.commit()
        cursor.close()
        conn.close()

        print("\n¡Limpieza completada exitosamente!")
        print("Se conservó intacta la información de Versiones y Detalles de Versiones.")

    except Exception as e:
        print(f"\n[ERROR CRÍTICO] Error al conectar o ejecutar la limpieza: {e}")
        sys.exit(1)

if __name__ == "__main__":
    clean_database()
