from app.database import SessionLocal
from app.models import WorkOrder

db = SessionLocal()
wos = db.query(WorkOrder).filter(WorkOrder.external_id == "1975").all()
for wo in wos:
    print(f"ID: {wo.id} | Ext: {wo.external_id} | Title: {wo.title}")
    print("Materials:", wo.materials)
    print("Volumes:", wo.volumes)
    print("---")
db.close()
