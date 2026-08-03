import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import WorkOrder, WorkOrderMessage, Admin

# Connect to DB
engine = create_engine('sqlite:///backend/database.db')
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

# Mock current admin
admin = db.query(Admin).first()
if not admin:
    print("No admin found")
    sys.exit(1)

# Test /chats query
from sqlalchemy import func
subquery = db.query(WorkOrderMessage.work_order_id, func.max(WorkOrderMessage.created_at).label("last_msg_time")).group_by(WorkOrderMessage.work_order_id).subquery()
chats = (
    db.query(WorkOrder, subquery.c.last_msg_time)
    .join(subquery, WorkOrder.id == subquery.c.work_order_id)
    .filter(WorkOrder.organization_id == admin.organization_id)
    .order_by(subquery.c.last_msg_time.desc())
    .all()
)

print(f"Found {len(chats)} chats.")
for wo, time in chats:
    print(f"WO {wo.id} - {wo.title} - {time}")
