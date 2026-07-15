from app.database import SessionLocal
from app.models import Vehicle, VehicleUserAssignment

db = SessionLocal()
handled_vehicle_ids = set()
unassigned_vehicles = db.query(Vehicle).filter(
    Vehicle.id.notin_(handled_vehicle_ids),
    Vehicle.imei != None
).all()
print(f"Unassigned vehicles count: {len(unassigned_vehicles)}")
for v in unassigned_vehicles:
    print(v.name, v.imei)
