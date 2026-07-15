import os
import sys
from dotenv import load_dotenv
load_dotenv(os.path.join(os.getcwd(), 'backend', '.env'))
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.database import engine
from app.models import Vehicle
from sqlalchemy.orm import sessionmaker

Session = sessionmaker(bind=engine)
db = Session()

for v in db.query(Vehicle).filter(Vehicle.type == 'Grue').all():
    print(f"Vehicle: {v.name} | Plate: {v.plate_number} | IMEI: {v.imei} | ID: {v.id}")

