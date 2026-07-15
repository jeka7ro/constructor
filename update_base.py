import sys, os
from dotenv import load_dotenv
load_dotenv(os.path.join(os.getcwd(), 'backend', '.env'))
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from app.database import engine
from sqlalchemy.orm import Session
from app.models import LogisticBase

with Session(engine) as db:
    base = db.query(LogisticBase).first()
    if base:
        base.latitude = 50.891138
        base.longitude = 4.398823
        db.commit()
        print(f"Base updated to: {base.latitude}, {base.longitude}")
    else:
        print("No bases found.")
