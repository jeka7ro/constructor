import sys
from datetime import date
from dotenv import load_dotenv

load_dotenv(".env")
from app.database import SessionLocal
from app.models import Admin, WorkOrder

db = SessionLocal()
admin = db.query(Admin).first()

wos = db.query(WorkOrder).filter(
    WorkOrder.organization_id == admin.organization_id,
    WorkOrder.start_date == date(2026, 7, 14),
    WorkOrder.status.in_(["sent", "confirmed", "in_progress", "completed"]),
    WorkOrder.assigned_team_id != None
).all()

print(f"Number of wos: {len(wos)}")
for w in wos:
    print(f"  WO: {w.id}, Team: {w.assigned_team_id}, Status: {w.status}")

