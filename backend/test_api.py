from app.database import SessionLocal
from app.models import WorkOrder
from app.api.admin_work_orders import list_work_orders
from pydantic import BaseModel

class MockAdmin(BaseModel):
    organization_id: str = "org_123"
    id: str = "admin_123"

db = SessionLocal()
admin = db.query(WorkOrder).first().client.organization if db.query(WorkOrder).first() else None
org_id = admin.id if admin else db.query(WorkOrder).first().organization_id
mock_admin = MockAdmin(organization_id=org_id)

try:
    res = list_work_orders(
        status=None,
        start_date=None,
        end_date=None,
        is_quote=None,
        ignore_quote_filter=True,
        limit=2000,
        slim=False,
        invoice_mode=False,
        audit_mode=True,
        db=db,
        current_admin=mock_admin
    )
    print(f"Total returned from API function: {len(res)}")
except Exception as e:
    print("Error:", e)
