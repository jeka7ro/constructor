from dotenv import load_dotenv
import os
load_dotenv(os.path.join(os.getcwd(), 'backend', '.env'))

import sys
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from app.database import engine
from app.models import Team, Vehicle, VehicleUserAssignment

from sqlalchemy.orm import sessionmaker
Session = sessionmaker(bind=engine)
db = Session()

print("--- TEAMS AND THEIR ASSIGNED VEHICLES ---")
teams = db.query(Team).all()
for t in teams:
    print(f"Team: {t.name} (ID: {t.id}, Leader: {t.team_leader_id})")
    if t.team_leader_id:
        assignment = db.query(VehicleUserAssignment).filter_by(user_id=t.team_leader_id, is_active=True).first()
        if assignment:
            v = db.query(Vehicle).filter_by(id=assignment.vehicle_id).first()
            if v:
                print(f"  -> Assigned Vehicle: {v.name} (Plate: {v.plate_number}, IMEI: {v.imei})")
            else:
                print("  -> Has assignment but vehicle not found")
        else:
            print("  -> No active vehicle assignment for leader")

print("\n--- ALL VEHICLES ---")
for v in db.query(Vehicle).all():
    print(f"Vehicle: {v.name} (Plate: {v.plate_number}, IMEI: {v.imei}, ID: {v.id})")

