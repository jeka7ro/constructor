import sys
import os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
from app.db.session import SessionLocal
from app.models.work_order import WorkOrder
from app.models.team import Team
from datetime import date
from sqlalchemy import or_

db = SessionLocal()
today = date.today()
print(f"Today is {today}")

teams = db.query(Team).all()
yellow_team = next((t for t in teams if "vasea" in t.name.lower() or "galben" in (t.color or "").lower() or t.color == '#EAB308'), None)

if yellow_team:
    print(f"Found Team: {yellow_team.name} (Color: {yellow_team.color})")
    
    # Query ALL work orders assigned to him for today
    wos = db.query(WorkOrder).filter(
        WorkOrder.assigned_team_id == yellow_team.id,
        WorkOrder.status.notin_(['cancelled', 'isoflex']),
        WorkOrder.start_date == today
    ).all()
    
    print(f"Found {len(wos)} work orders for today (like Logistics):")
    for w in wos:
        print(f" - ID: {w.id}, Status: {w.status}, Start Date: {w.start_date}, Client Name: {w.client_name}")
        
    print("\nLet's check if there are any other works not assigned to today but maybe appear? No, logistics explicitly checks start_date == today.")
    
    # Wait, the user said "cea de a 3a este de fapt o lucrare care a fost facuta deja luni."
    # Let's query ALL work orders assigned to him that are NOT today to see if there is one that was done on Monday but somehow appears today?
    wos_monday = db.query(WorkOrder).filter(
        WorkOrder.assigned_team_id == yellow_team.id,
        WorkOrder.status.notin_(['cancelled', 'isoflex']),
        WorkOrder.start_date == '2026-08-03'
    ).all()
    print(f"\nFound {len(wos_monday)} work orders for Monday (2026-08-03):")
    for w in wos_monday:
        print(f" - ID: {w.id}, Status: {w.status}, Start Date: {w.start_date}, Client Name: {w.client_name}")

else:
    print("Yellow team not found.")
