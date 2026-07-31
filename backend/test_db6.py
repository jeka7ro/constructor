from app.database import SessionLocal
from app.models import WorkOrder
import datetime

db = SessionLocal()
wo = db.query(WorkOrder).filter(WorkOrder.token == "0wEqF-6hHi9zPgAKWM3uMbzmV3jvETPUWXMFvAHJ3ww").first()
if wo:
    old_start_date = wo.start_date
    print("before update:", wo.start_date, wo.date_confirmed_at)
    
    # simulate PUT
    setattr(wo, "start_date", "2026-08-09")
    
    if old_start_date != wo.start_date:
        wo.date_confirmed_at = None
        print("Set to None!")
        
    db.commit()
    db.refresh(wo)
    print("after commit:", wo.start_date, wo.date_confirmed_at)
    
    # reset it back
    setattr(wo, "start_date", old_start_date)
    wo.date_confirmed_at = datetime.datetime.utcnow()
    db.commit()
