import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.database import SessionLocal
from app.models import WorkOrder
import json

db = SessionLocal()
orders = db.query(WorkOrder).all()
found = 0
for wo in orders:
    if wo.volumes and str(wo.volumes) != '[]' and str(wo.volumes) != 'None':
        print(f"ID: {wo.external_id}, Vols: {wo.volumes}")
        found += 1
print(f"Found {found} matches with volumes.")
