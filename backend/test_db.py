from app.database import SessionLocal
from app.models import WorkOrder

db = SessionLocal()
wos = db.query(WorkOrder).filter(WorkOrder.quote_number != None).order_by(WorkOrder.created_at.desc()).limit(3).all()
for wo in wos:
    print(f"ID: {wo.id}")
    print(f"start_date: {wo.start_date}")
    print(f"date_confirmed_at: {wo.date_confirmed_at}")
    print(f"confirmed_at: {wo.confirmed_at}")
    print(f"status: {wo.status}")
    print("---")
