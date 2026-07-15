import sys
from dotenv import load_dotenv
load_dotenv(".env")
from app.database import SessionLocal
from app.models import Vehicle

db = SessionLocal()
MAN2 = db.query(Vehicle).filter(Vehicle.name == "MAN2").first()
DAF = db.query(Vehicle).filter(Vehicle.name == "DAF").first()
print(f"MAN2: {MAN2.flespi_device_id}")
print(f"DAF: {DAF.flespi_device_id}")

