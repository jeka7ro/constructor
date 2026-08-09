import sys
from datetime import datetime
from app.database import SessionLocal
from app.models import WorkOrder
db = SessionLocal()

since_str = "2026-08-03T16:07:05.123Z"
since_str = since_str.replace('Z', '+00:00')
since_dt = datetime.fromisoformat(since_str)
since_dt = since_dt.replace(tzinfo=None)

query = db.query(WorkOrder).filter(WorkOrder.is_quote == True, WorkOrder.status == "draft")
count1 = query.count()
count2 = query.filter(WorkOrder.created_at > since_dt).count()
print(f"Total drafts: {count1}")
print(f"Drafts since {since_dt}: {count2}")
