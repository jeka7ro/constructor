from app.database import SessionLocal
from app.models import Admin, WorkOrder
from app.api.admin_work_orders import list_work_orders

db = SessionLocal()
admin = db.query(Admin).first()
if not admin:
    print("No admin found in local db.")
else:
    try:
        res = list_work_orders(None, db, admin)
        print("Success! Got", len(res), "work orders.")
    except Exception as e:
        print("ERROR:", e)
