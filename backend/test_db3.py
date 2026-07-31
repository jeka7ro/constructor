from app.database import SessionLocal
from app.models import WorkOrder

db = SessionLocal()
wo = db.query(WorkOrder).filter(WorkOrder.external_id == "0wEqF-6hHi9zPgAKWM3uMbzmV3jvETPUWXMFvAHJ3ww").first()
if wo:
    print(f"ID: {wo.id}")
    print(f"start_date: {wo.start_date}")
    print(f"date_confirmed_at: {wo.date_confirmed_at}")
    print(f"confirmed_at: {wo.confirmed_at}")
    print(f"proforma_data: {wo.proforma_data}")
