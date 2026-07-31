import sys
from app.database import SessionLocal
from app.models import WorkOrderMessage, WorkOrder, Admin

db = SessionLocal()
admin = db.query(Admin).filter_by(email="carabetiulian@gmail.com").first()
print("Admin org:", admin.organization_id)

query = db.query(WorkOrderMessage).join(WorkOrder).filter(
    WorkOrder.organization_id == admin.organization_id,
    WorkOrderMessage.sender == 'client',
    WorkOrderMessage.is_read_by_admin == False
)
print("Count:", query.count())
for msg in query.all():
    print(f"Unread msg: {msg.message}")
