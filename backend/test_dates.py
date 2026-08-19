from app.database import SessionLocal
from app.models import WorkOrder
from datetime import datetime
db = SessionLocal()

wos = db.query(WorkOrder).filter(WorkOrder.is_quote == True).all()
august_wos = [wo for wo in wos if wo.created_at and wo.created_at >= datetime(2026, 8, 1)]

print(f"Total August Quotes: {len(august_wos)}")
for wo in august_wos:
    print(f"ID: {wo.id}, System: {wo.source_system}, Created: {wo.created_at}")
