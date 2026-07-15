import sys
from dotenv import load_dotenv

load_dotenv(".env")
from app.database import SessionLocal
from app.models import Admin, Vehicle

db = SessionLocal()
admin = db.query(Admin).filter(Admin.organization_id == "db8a2926-175d-47f8-b041-ec824993d6d5").first()

unassigned_vehicles = db.query(Vehicle).filter(
    Vehicle.organization_id == admin.organization_id,
    Vehicle.status == 'active',
    Vehicle.flespi_device_id != None
).all()

print(f"Number of unassigned_vehicles: {len(unassigned_vehicles)}")
for v in unassigned_vehicles:
    print(v.name, v.type)
