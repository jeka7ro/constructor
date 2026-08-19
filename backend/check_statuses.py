from app.database import SessionLocal
from app.models import WorkOrder

db = SessionLocal()
wos = db.query(WorkOrder).filter(WorkOrder.is_quote == True).all()
statuses = [wo.status for wo in wos]
from collections import Counter
print(Counter(statuses))
