import sys
import os
sys.path.append(os.getcwd() + '/backend')
from app.db.session import SessionLocal
from app.models.work_order import WorkOrder
from app.models.team import Team
from datetime import date

db = SessionLocal()
today = date.today()
print(f"Today is {today}")

teams = db.query(Team).all()
yellow_team = None
for t in teams:
    if "Vasea" in t.name or "galben" in (t.color or "").lower() or "yellow" in (t.color or "").lower():
        yellow_team = t
        break

if not yellow_team:
    for t in teams:
        if t.color == '#FACC15' or t.color == '#EAB308' or t.color == '#eab308' or t.color == '#facc15':
            yellow_team = t
            break

if yellow_team:
    print(f"Found Team: {yellow_team.name} (Color: {yellow_team.color})")
    wos = db.query(WorkOrder).filter(
        WorkOrder.assigned_team_id == yellow_team.id,
        WorkOrder.start_date == today,
        WorkOrder.status.notin_(['cancelled', 'isoflex'])
    ).all()
    print(f"Found {len(wos)} work orders for today:")
    for w in wos:
        print(f" - ID: {w.id}, Status: {w.status}, Start Date: {w.start_date}, Client Name: {w.client_name}")
else:
    print("Yellow team not found. Here are all teams:")
    for t in teams:
        print(f" - {t.name} (Color: {t.color})")
