import sys
from dotenv import load_dotenv

load_dotenv(".env")
from app.database import SessionLocal
from app.models import Admin, Vehicle

db = SessionLocal()
admin = db.query(Admin).filter(Admin.organization_id == "db8a2926-175d-47f8-b041-ec824993d6d5").first()

vehicles = db.query(Vehicle).all()
print(f"Total vehicles: {len(vehicles)}")
for v in vehicles:
    print(v.name, v.organization_id)
