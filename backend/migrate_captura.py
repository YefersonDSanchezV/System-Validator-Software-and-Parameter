from app.core.database import engine
import sqlalchemy as sa

with engine.connect() as conn:
    # Check last rechazado record
    result = conn.execute(sa.text(
        "SELECT r.oid, r.nombre_registra, r.captura_id, f.firma IS NOT NULL as tiene_captura, LEFT(f.firma, 50) as captura_preview "
        "FROM regrechazado r LEFT JOIN firmas f ON r.captura_id = f.oid "
        "ORDER BY r.oid DESC LIMIT 5"
    ))
    rows = result.fetchall()
    for row in rows:
        print(dict(row._mapping))
