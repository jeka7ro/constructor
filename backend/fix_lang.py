from app.database import SessionLocal
from app.models import WorkOrder

db = SessionLocal()
wo = db.query(WorkOrder).filter(WorkOrder.id == '2a758d42-24fd-497f-9de1-73e56d91ee39').first()
if wo:
    wo.client_language = 'en'
    db.commit()
    print("Fixed 2a758d42-24fd-497f-9de1-73e56d91ee39 to EN")
db.close()
