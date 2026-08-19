import sys
import os
import json

sys.path.insert(0, os.path.abspath('backend'))
from dotenv import load_dotenv
load_dotenv('backend/.env')

from app.database import engine, SessionLocal
from app.models import WorkOrder

db = SessionLocal()
wo = db.query(WorkOrder).filter(WorkOrder.client_name.ilike('%Soufiane%')).first()

print(f"WO Title: {wo.title}")
print(f"Estimated Price: {wo.estimated_price}")
print(f"Prices: {json.dumps(wo.prices, indent=2) if wo.prices else None}")
print(f"Volumes: {json.dumps(wo.volumes, indent=2) if wo.volumes else None}")
