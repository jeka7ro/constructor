from app.database import SessionLocal
from app.models import WorkOrder
import json

db = SessionLocal()
wo = db.query(WorkOrder).filter(WorkOrder.id == '80ec6d63-fa1c-4007-8fe4-8fc06d1ae6a3').first()
if wo:
    print("PROFORMA DATA:", json.dumps(wo.proforma_data, indent=2))
    print("PRICES:", json.dumps(wo.prices, indent=2))
else:
    print("WO NOT FOUND")
db.close()
