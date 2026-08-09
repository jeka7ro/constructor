import sys
from app.database import SessionLocal
from app.models import WorkOrder
db = SessionLocal()
print("Draft Quotes:", db.query(WorkOrder).filter(WorkOrder.is_quote == True, WorkOrder.status == 'draft').count())
print("All Quotes:", db.query(WorkOrder).filter(WorkOrder.is_quote == True).count())
print("All Work Orders:", db.query(WorkOrder).count())
