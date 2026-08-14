from app.database import SessionLocal
from app.models import WorkOrder, WorkOrderMessage
db = SessionLocal()
wo = db.query(WorkOrder).filter(WorkOrder.id == '4ac055f0-4d95-4fbe-aaf5-c46955763151').first()
print(f"WO client_email: {wo.client_email if wo else 'Not found'}")
msgs = db.query(WorkOrderMessage).filter(WorkOrderMessage.work_order_id == wo.id).order_by(WorkOrderMessage.created_at.desc()).limit(5).all()
for m in msgs:
    print(f"Msg: sender={m.sender}, created_at={m.created_at}, text={m.message}")
