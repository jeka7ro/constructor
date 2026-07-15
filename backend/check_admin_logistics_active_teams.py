import sys
from dotenv import load_dotenv

load_dotenv(".env")
from app.database import SessionLocal
from app.models import Admin, WorkOrder

db = SessionLocal()
wos = db.query(WorkOrder).filter(
    WorkOrder.start_date == "2026-07-14",
    WorkOrder.status.in_(["sent", "confirmed", "in_progress", "completed"]),
    WorkOrder.assigned_team_id != None
).all()
print(f"Number of matched wos: {len(wos)}")
for w in wos:
    print(f"WO: {w.id}, team: {w.assigned_team_id}")
