import os
from dotenv import load_dotenv
load_dotenv("backend/.env")

from app.database import SessionLocal
from app.models import WorkOrder, Team
from datetime import date

db = SessionLocal()
wos = db.query(WorkOrder).filter(WorkOrder.start_date == date(2026, 7, 14)).all()
for w in wos:
    team = db.query(Team).filter(Team.id == w.assigned_team_id).first() if w.assigned_team_id else None
    if team and "Petrea" in team.name:
        print(f"WO {w.id}: Status={w.status}, Title={w.title.split(chr(10))[0] if w.title else 'None'}")
db.close()
