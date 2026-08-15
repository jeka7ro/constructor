import sys
import os
sys.path.append(os.path.abspath("backend"))
from app.database import SessionLocal
from app.models import WorkOrder
db = SessionLocal()
wo = db.query(WorkOrder).filter(WorkOrder.is_quote == True).first()
if wo:
    print(f"WO ID: {wo.id}")
    print(f"start_date: {wo.start_date}, type: {type(wo.start_date)}")
    wo.start_date = "2026-08-28"
    db.commit()
    db.refresh(wo)
    print(f"After string assign: start_date: {wo.start_date}, type: {type(wo.start_date)}")
