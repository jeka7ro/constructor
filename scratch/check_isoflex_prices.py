import sys
import os
import json

sys.path.insert(0, os.path.abspath('backend'))
from dotenv import load_dotenv
load_dotenv('backend/.env')

from app.database import engine, SessionLocal
from app.models import Client, WorkOrder

db = SessionLocal()
wo = db.query(WorkOrder).filter(WorkOrder.id == '5e9c065f-4a0b-4682-9ed8-cf39cc0bc96f').first()
if not wo:
    wo = db.query(WorkOrder).filter(WorkOrder.client_name.ilike('%ISOFLEX%')).order_by(WorkOrder.created_at.desc()).first()

print(f"WO Title: {wo.title}")
print(f"Prices: {json.dumps(wo.prices, indent=2) if wo.prices else None}")
print(f"Volumes: {json.dumps(wo.volumes, indent=2) if wo.volumes else None}")
print(f"Proforma: {json.dumps(wo.proforma_data, indent=2) if wo.proforma_data else None}")
