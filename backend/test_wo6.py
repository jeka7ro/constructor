from app.database import SessionLocal
from app.models import WorkOrder
import json

db = SessionLocal()
wo = db.query(WorkOrder).filter(WorkOrder.id == '80ec6d63-fa1c-4007-8fe4-8fc06d1ae6a3').first()
if wo:
    print("VOLUMES:", json.dumps(wo.volumes, indent=2))
    print("SURFACE:", wo.surface_m2)
    print("THICKNESS:", wo.thickness_cm)
    print("WO HAS_FOIL:", wo.has_foil)
else:
    print("WO NOT FOUND")
db.close()
