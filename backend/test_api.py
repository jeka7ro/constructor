from app.database import SessionLocal
from app.models import WorkOrder, Admin
db = SessionLocal()
admin = db.query(Admin).first()
if not admin:
    print("No admin found")
else:
    count = db.query(WorkOrder).filter(
        WorkOrder.organization_id == admin.organization_id,
        WorkOrder.is_quote == True,
        WorkOrder.status == "draft"
    ).count()
    print("Drafts for admin org:", count)
