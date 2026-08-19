import sys
import os

sys.path.insert(0, os.path.abspath('backend'))
from dotenv import load_dotenv
load_dotenv('backend/.env')

from app.database import engine, SessionLocal
from app.models import Client, WorkOrder

db = SessionLocal()
wo = db.query(WorkOrder).filter(WorkOrder.client_name.ilike('%ISOFLEX%')).first()
print(f"WO client type: {wo.client_type}")
print(f"WO vat_type: {wo.prices.get('vat_type') if wo.prices else None}")

wo_soufiane = db.query(WorkOrder).filter(WorkOrder.client_name.ilike('%Soufiane%')).first()
if wo_soufiane:
    print(f"WO Soufiane client type: {wo_soufiane.client_type}")
    print(f"WO Soufiane vat_type: {wo_soufiane.prices.get('vat_type') if wo_soufiane.prices else None}")
