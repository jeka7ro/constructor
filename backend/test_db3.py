from app.database import SessionLocal
from app.models import WorkOrder

db = SessionLocal()
wos = db.query(WorkOrder).filter(WorkOrder.source_system == "robaws").order_by(WorkOrder.start_date.desc()).limit(10).all()
print(f"Total Robaws WorkOrders: {len(wos)}")
for wo in wos:
    print(f"ID: {wo.id} | Ext: {wo.external_id} | Title: {wo.title}")
    print("Materials:", wo.materials)
    print("Volumes:", wo.volumes)
    print("---")
db.close()
