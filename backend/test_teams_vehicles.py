from dotenv import load_dotenv
load_dotenv(".env")
from app.database import SessionLocal
from app.models import Team, Vehicle, VehicleUserAssignment

db = SessionLocal()
teams = db.query(Team).all()
print("--- TEAMS ---")
for t in teams:
    print(f"Team: {t.name}, LeaderID: {t.team_leader_id}, Flespi?: {getattr(t, 'flespi_device_id', 'N/A')}")

vehicles = db.query(Vehicle).all()
print("\n--- VEHICLES ---")
for v in vehicles:
    print(f"Vehicle: {v.name}, Type: {v.type}, Flespi: {getattr(v, 'flespi_device_id', 'N/A')}")

assignments = db.query(VehicleUserAssignment).filter(VehicleUserAssignment.is_active == True).all()
print("\n--- ASSIGNMENTS ---")
for a in assignments:
    print(f"User: {a.user_id}, Vehicle: {a.vehicle_id}")

