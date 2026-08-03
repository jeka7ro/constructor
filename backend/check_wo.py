import asyncio
from app.database import SessionLocal
from app.models import WorkOrder

db = SessionLocal()
wo = db.query(WorkOrder).filter(WorkOrder.token == "KDrm5Q7ib9ngQbj5p_ROkxMsMvtqspjSgKm-aiTbUTY").first()
if wo:
    print(f"FOUND: ID={wo.id}, Status={wo.status}, Client={wo.client_name}")
else:
    print("NOT FOUND")
db.close()
