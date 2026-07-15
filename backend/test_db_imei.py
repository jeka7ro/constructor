from app.database import SessionLocal
from sqlalchemy import text as sqlt

db = SessionLocal()
rows = db.execute(sqlt("SELECT id, name, imei FROM saas_app.vehicles")).fetchall()
for r in rows:
    print(r.id, r.name, r.imei)
