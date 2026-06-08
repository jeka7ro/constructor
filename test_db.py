from app.database import SessionLocal
from app.models import WorkOrder
import json

db = SessionLocal()
wos = db.query(WorkOrder).order_by(WorkOrder.created_at.desc()).limit(5).all()
for wo in wos:
    print(f"ID: {wo.id} | Ext: {wo.external_id} | Title: {wo.title}")
    print("Materials:", wo.materials)
    print("Volumes:", wo.volumes)
    print("---")
db.close()
