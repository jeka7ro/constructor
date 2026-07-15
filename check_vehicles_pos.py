import sys, os
from dotenv import load_dotenv
load_dotenv(os.path.join(os.getcwd(), 'backend', '.env'))
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from app.database import engine
from sqlalchemy.orm import Session
from app.models import Vehicle

with Session(engine) as db:
    vs = db.query(Vehicle).all()
    for v in vs:
        print(f"Vehicle {v.name}: {v.last_lat}, {v.last_lng}")
