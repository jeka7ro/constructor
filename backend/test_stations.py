import sys
import os
sys.path.append(os.getcwd())
from app.database import SessionLocal
from app.models import LogisticSandStation

db = SessionLocal()
stations = db.query(LogisticSandStation).all()
print("Total stations:", len(stations))
for s in stations:
    print(s.id, s.name, s.is_active, s.organization_id)
