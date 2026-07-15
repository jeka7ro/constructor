import sys
from dotenv import load_dotenv

load_dotenv(".env")
from app.database import SessionLocal
from app.models import Admin, WorkOrder

db = SessionLocal()
wos = db.query(WorkOrder).all()
print(f"Total wos: {len(wos)}")
for w in wos[:5]:
    print(f"WO: {w.id}, start_date: {w.start_date}, status: {w.status}, org: {w.organization_id}")
