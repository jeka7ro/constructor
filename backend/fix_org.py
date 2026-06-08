import sys
from app.database import SessionLocal
from app.models import LogisticSandStation

db = SessionLocal()
stations = db.query(LogisticSandStation).all()
for s in stations:
    s.organization_id = '84b73e6b-8e3c-45f6-b133-9e19d41a1bf2'
db.commit()
print("Fixed Org ID for Sand Stations!")
