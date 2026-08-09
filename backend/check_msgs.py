import sys
from app.database import SessionLocal
from app.models import WorkOrderMessage, WorkOrder
db = SessionLocal()
wo = db.query(WorkOrder).filter(WorkOrder.token == 'ufzslkItor4Mgmnori5rs72cSSj_hl2gkCacxtkjq7Y').first()
msgs = db.query(WorkOrderMessage).filter(WorkOrderMessage.work_order_id == wo.id).all()
for m in msgs:
    print(f"ID: {m.id}, MSG: {m.message}, TIME: {m.created_at}")
