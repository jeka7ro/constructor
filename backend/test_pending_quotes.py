from app.database import SessionLocal
from app.models import WorkOrder
from app.api.admin_work_orders import list_work_orders
from pydantic import BaseModel

class MockAdmin(BaseModel):
    organization_id: str = "org_123"
    id: str = "admin_123"

db = SessionLocal()
org_id = db.query(WorkOrder).first().organization_id
mock_admin = MockAdmin(organization_id=org_id)

res = list_work_orders(
    status="draft,pending,confirmed", start_date=None, end_date=None, is_quote=True,
    ignore_quote_filter=False, limit=None, slim=True, invoice_mode=False,
    audit_mode=False, db=db, current_admin=mock_admin
)

print(f"Total pending quotes: {len(res)}")
for wo in res:
    print(wo.get('id'), wo.get('status'), wo.get('source_system'), wo.get('title'))
