from app.database import SessionLocal
from app.models import WorkOrder

db = SessionLocal()
wos = db.query(WorkOrder).filter(
    WorkOrder.start_date.isnot(None),
    WorkOrder.status == 'pending',
    WorkOrder.source_system == 'partner'
).all()

for wo in wos:
    print(f"Fixing status for WO {wo.id} from pending to planning")
    wo.status = 'planning'

db.commit()
print("Done")
