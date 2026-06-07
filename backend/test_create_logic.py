from datetime import datetime
from app.database import SessionLocal
from app.models import Admin, WorkOrder

db = SessionLocal()
admin = db.query(Admin).first()

if admin:
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    count_today = db.query(WorkOrder).filter(
        WorkOrder.organization_id == admin.organization_id,
        WorkOrder.created_at >= today_start
    ).count()
    
    auto_title = f"DC-{datetime.now().strftime('%d%m%Y')}-{count_today + 1:02d}"
    print(auto_title)
else:
    print("No admin")
