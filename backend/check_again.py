import sys
from app.database import SessionLocal
from app.models import LogisticSandStation

db = SessionLocal()
stations = db.query(LogisticSandStation).all()
print(f"Total stations in DB: {len(stations)}")
for s in stations:
    print(f"Station {s.name} - Org ID: {s.organization_id}")

