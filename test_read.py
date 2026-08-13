import sys
sys.path.append('.')
from backend.app.database import SessionLocal
from backend.app.models import WorkOrder
db = SessionLocal()
wos = db.query(WorkOrder).filter(WorkOrder.is_quote == True).order_by(WorkOrder.created_at.desc()).limit(10).all()
for wo in wos:
    print(f"ID: {wo.id}, QuoteNo: {wo.quote_number}, ReadBy: {wo.read_by_admins}")
