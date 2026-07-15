from dotenv import load_dotenv
load_dotenv(".env")
from app.database import SessionLocal
from app.models import Vehicle

db = SessionLocal()
vehicles = db.query(Vehicle).all()
for v in vehicles:
    print(f"Vehicle {v.name}: Type: {v.type}, Flespi ID: {v.flespi_device_id}")
