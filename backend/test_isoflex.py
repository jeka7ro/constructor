import os
from dotenv import load_dotenv
load_dotenv("backend/.env")

from app.database import SessionLocal
from app.models import WorkOrder
from datetime import date

db = SessionLocal()
wos = db.query(WorkOrder).filter(WorkOrder.start_date == date(2026, 7, 14)).all()
for w in wos:
    print(f"WO {w.id}: title={w.title}")
db.close()
