import asyncio
from app.database import SessionLocal
from app.models import WorkOrder

db = SessionLocal()
wos = db.query(WorkOrder).filter(WorkOrder.status == 'isoflex', WorkOrder.assigned_team_id != None).all()
print(f"Total isoflex with team: {len(wos)}")
