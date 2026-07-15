import sys
from dotenv import load_dotenv

load_dotenv(".env")
from app.database import SessionLocal
from app.models import WorkOrder

db = SessionLocal()
wos = db.query(WorkOrder).filter(WorkOrder.start_date == "2026-07-14").all()
for w in wos:
    print(f"ID: {w.id}, Status: {w.status}, Team: {getattr(w, 'assigned_team_id', 'none')}")
