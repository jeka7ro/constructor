import os
import sys
os.environ['DATABASE_URL'] = 'postgresql://postgres.ltxbghtnygnguoegtgfo:30Martie2026!@aws-1-eu-west-2.pooler.supabase.com:6543/postgres'
os.environ['JWT_SECRET_KEY'] = 'dev-secret-key-change-in-production-12345678'

# Add backend directory to sys.path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend'))
sys.path.insert(0, backend_path)

from app.database import SessionLocal
from app.models import WorkOrderMessage, WorkOrder, Admin

db = SessionLocal()

# Get recent client messages
msgs = db.query(WorkOrderMessage, WorkOrder).join(WorkOrder, WorkOrderMessage.work_order_id == WorkOrder.id).filter(WorkOrderMessage.sender == 'client').order_by(WorkOrderMessage.created_at.desc()).limit(5).all()

for msg, wo in msgs:
    print(f"Message ID: {msg.id}")
    print(f"  Sender: {msg.sender}")
    print(f"  Message: {msg.message}")
    print(f"  is_read_by_admin: {msg.is_read_by_admin}")
    print(f"  created_at: {msg.created_at}")
    print(f"  WO org: {wo.organization_id}")
    print(f"  WO client: {wo.client_name}")

print("\nAdmins:")
admins = db.query(Admin).limit(5).all()
for a in admins:
    print(f"Admin: {a.email}, org: {a.organization_id}")

