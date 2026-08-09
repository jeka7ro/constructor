import sys
import os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
from app.db.session import SessionLocal
from app.models.work_order import WorkOrder
from app.models.team import Team
from datetime import date

db = SessionLocal()
today = date.today()
print(f"Today is {today}")

teams = db.query(Team).all()
yellow_team = next((t for t in teams if "vasea" in t.name.lower() or "galben" in (t.color or "").lower() or t.color == '#EAB308'), None)

if yellow_team:
    wos = db.query(WorkOrder).filter(
        WorkOrder.assigned_team_id == yellow_team.id,
        WorkOrder.start_date == today
    ).all()
    
    print(f"Found {len(wos)} total work orders for {yellow_team.name} today:")
    for w in wos:
        print(f" - ID: {w.id}, Status: {w.status}, Start Date: {w.start_date}, Client Name: {w.client_name}")
