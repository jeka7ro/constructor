from app.database import SessionLocal
from app.models import WorkOrder
import datetime

db = SessionLocal()
wo = db.query(WorkOrder).filter(WorkOrder.token == "0wEqF-6hHi9zPgAKWM3uMbzmV3jvETPUWXMFvAHJ3ww").first()
if wo:
    old_start_date = wo.start_date
    update_data = {"start_date": "2026-08-06"} # SAME AS IN DB RIGHT NOW!
    setattr(wo, "start_date", update_data["start_date"])
    print("old:", type(old_start_date), old_start_date)
    print("new:", type(wo.start_date), wo.start_date)
    print("equal?:", old_start_date == wo.start_date)
