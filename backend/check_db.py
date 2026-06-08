import sys
from app.database import SessionLocal
from app.models import LogisticSandStation, Organization

db = SessionLocal()
stations = db.query(LogisticSandStation).all()
print(f"Found {len(stations)} stations in DB")
if stations:
    print(f"Org ID of first station: {stations[0].organization_id}")

orgs = db.query(Organization).all()
print(f"Available org IDs: {[o.id for o in orgs]}")
