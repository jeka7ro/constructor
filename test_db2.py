import os, sys
from dotenv import load_dotenv
load_dotenv(os.path.join(os.getcwd(), 'backend', '.env'))
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from app.database import engine
from app.models import Vehicle
from sqlalchemy.orm import sessionmaker

Session = sessionmaker(bind=engine)
db = Session()

# test
vehicles = db.query(Vehicle).filter(Vehicle.imei != None).all()
print(f"Found {len(vehicles)} vehicles with imei != None")
vehicles2 = db.query(Vehicle).filter(Vehicle.imei.isnot(None)).all()
print(f"Found {len(vehicles2)} vehicles with imei.isnot(None)")

