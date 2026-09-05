import pyodbc
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

def get_sql_server_connection(timeout: int = 5):
    try:
        conn_str = (
            f"DRIVER={{{settings.DB_DRIVER}}};"
            f"SERVER={settings.DB_SERVER};"
            f"DATABASE={settings.DB_DATABASE};"
            f"UID={settings.DB_USER_SQL};"
            f"PWD={settings.DB_PASSWORD_SQL};"
            f"TrustServerCertificate={settings.DB_TRUST_CERTIFICATE};"
            f"Connection Timeout={timeout};"
        )
        return pyodbc.connect(conn_str, timeout=timeout)
    except Exception as e:
        logger.error(f"Error conectando a SQL Server: {e}")
        raise

def get_parametros_clinicos():
    conn = get_sql_server_connection()
    cursor = conn.cursor()
    try:
        # Historia Clinica
        cursor.execute("SELECT HCPDIAAUT FROM HCNPARAME WHERE OID = 1")
        row_hc = cursor.fetchone()
        hcpdiaaut = row_hc[0] if row_hc else 30

        # Enfermeria
        cursor.execute("SELECT HCNMHRCRENF, HCNHAPLMED FROM HCNPARAME WHERE OID = 1")
        row_enf = cursor.fetchone()
        hcnmhcrenf = row_enf[0] if row_enf else 48
        hcnhaplmed = row_enf[1] if row_enf else 48

        return {
            "historia_clinica": hcpdiaaut,
            "enfermeria_hcrenf": hcnmhcrenf,
            "enfermeria_haplmed": hcnhaplmed
        }
    finally:
        cursor.close()
        conn.close()

def update_parametro_historia_clinica(valor: int):
    conn = get_sql_server_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE HCNPARAME SET HCPDIAAUT = ? WHERE OID = 1", (valor,))
        conn.commit()
    finally:
        cursor.close()
        conn.close()

def update_parametro_enfermeria(valor_crenf: int, valor_aplmed: int):
    conn = get_sql_server_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE HCNPARAME SET HCNMHRCRENF = ?, HCNHAPLMED = ? WHERE OID = 1", (valor_crenf, valor_aplmed))
        conn.commit()
    finally:
        cursor.close()
        conn.close()

def get_paciente_por_ingreso(ingreso: str):
    conn = get_sql_server_connection()
    cursor = conn.cursor()
    try:
        query = """
        SELECT TOP 10
            AINCONSEC,
            AINFECING, 
            G.PACNUMDOC,
            ISNULL(G.PACPRINOM, '') + ' ' + 
            ISNULL(G.PACSEGNOM, '') + ' ' + 
            ISNULL(G.PACPRIAPE, '') + ' ' + 
            ISNULL(G.PACSEGAPE, '') AS NOMBRE_COMPLETO
        FROM ADNINGRESO A
        INNER JOIN GENPACIEN G ON G.OID = A.GENPACIEN
        where A.AINCONSEC = ?
        """
        cursor.execute(query, (ingreso,))
        row = cursor.fetchone()
        if row:
            return {
                "ainconsec": row[0],
                "ainfecing": row[1],
                "pacnumdoc": row[2],
                "nombre_completo": row[3].strip()
            }
        return None
    finally:
        cursor.close()
        conn.close()
