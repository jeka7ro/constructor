from app.database import SessionLocal
from app.models import WorkOrder

db = SessionLocal()
wos = db.query(WorkOrder).filter(WorkOrder.start_date == '2026-08-06').all()
for wo in wos:
    print(f"ID: {wo.id}")
    print(f"start_date: {wo.start_date}")
    print(f"date_confirmed_at: {wo.date_confirmed_at}")
    print(f"confirmed_at: {wo.confirmed_at}")
    print("---")
