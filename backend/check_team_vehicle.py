import sys
from dotenv import load_dotenv

load_dotenv(".env")
from app.database import SessionLocal
from app.models import Admin, Vehicle, Team, TripLog

db = SessionLocal()
admin = db.query(Admin).filter(Admin.organization_id == "db8a2926-175d-47f8-b041-ec824993d6d5").first()

team = db.query(Team).filter(Team.name == "Echipa Petrea").first()
if team:
    print(f"Team: {team.name}, Color: {team.color}")
    
    # Check works for target date
    target_date = "2026-07-14"
    from app.models import WorkOrder
    works = db.query(WorkOrder).filter(
        WorkOrder.assigned_team_id == team.id,
        WorkOrder.scheduled_date == target_date,
        WorkOrder.status.in_(['sent', 'confirmed', 'in_progress', 'completed'])
    ).all()
    
    assigned_vehicle_id = None
    for w in works:
        if getattr(w, 'assigned_vehicle_id', None):
            assigned_vehicle_id = getattr(w, 'assigned_vehicle_id', None)
            break
            
    if assigned_vehicle_id:
        v = db.query(Vehicle).filter(Vehicle.id == assigned_vehicle_id).first()
        if v:
            print(f"Assigned vehicle from works: {v.name}")
    else:
        print("No vehicle assigned in works.")
else:
    print("Team Echipa Petrea not found")
