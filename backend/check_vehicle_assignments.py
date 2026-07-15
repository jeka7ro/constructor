import sys
from dotenv import load_dotenv

load_dotenv(".env")
from app.database import SessionLocal
from app.models import Admin, Vehicle, Team, VehicleUserAssignment

db = SessionLocal()
admin = db.query(Admin).filter(Admin.organization_id == "db8a2926-175d-47f8-b041-ec824993d6d5").first()

assignments = db.query(VehicleUserAssignment).all()
for a in assignments:
    print(a.vehicle_id, a.user_id)
    
# Let's also check if Team has a team_leader_id which is assigned to a vehicle
teams = db.query(Team).all()
for t in teams:
    assigned = db.query(VehicleUserAssignment).filter(VehicleUserAssignment.user_id == t.team_leader_id).first()
    if assigned:
        v = db.query(Vehicle).filter(Vehicle.id == assigned.vehicle_id).first()
        print(f"Team {t.name} leader has vehicle {v.name}")
