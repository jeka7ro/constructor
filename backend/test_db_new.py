from app.database import SessionLocal
from app.models import WorkOrder
from datetime import datetime

db = SessionLocal()
# Check items created today
wos = db.query(WorkOrder).filter(WorkOrder.created_at >= '2026-06-07').all()
print(f"Total NEW Robaws WorkOrders: {len(wos)}")
for wo in wos:
    print(f"ID: {wo.id} | Ext: {wo.external_id} | Title: {wo.title}")
    print("Materials:", wo.materials)
    print("Volumes:", wo.volumes)
    print("---")
db.close()
