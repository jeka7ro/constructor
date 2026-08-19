import asyncio
from app.database import SessionLocal
from app.models import Organization, Client, WorkOrder

db = SessionLocal()
org = db.query(Organization).first()
wo = db.query(WorkOrder).filter(WorkOrder.organization_id == org.id).first()

from app.api.admin_work_orders import sync_work_order_prices
class DummyAdmin:
    organization_id = org.id
    full_name = "Test Admin"

try:
    res = sync_work_order_prices(wo_id=wo.id, current_admin=DummyAdmin(), db=db)
    print("Success:", res)
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
