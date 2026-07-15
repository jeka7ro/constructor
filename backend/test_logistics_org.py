import sys
from dotenv import load_dotenv

load_dotenv(".env")
from app.database import SessionLocal
from app.models import Admin, WorkOrder

db = SessionLocal()
admin = db.query(Admin).first()
print(f"Admin org: {admin.organization_id}")

wo = db.query(WorkOrder).filter(WorkOrder.id == "81917852-f4c8-40e9-a6a1-238be0fe90aa").first()
print(f"WO org: {wo.organization_id}")

wos = db.query(WorkOrder).filter(
    WorkOrder.start_date == "2026-07-14",
    WorkOrder.status.in_(["sent", "confirmed", "in_progress", "completed"]),
    WorkOrder.assigned_team_id != None
).all()
print(f"Number of matched wos: {len(wos)}")
