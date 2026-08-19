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
    status=None, start_date=None, end_date=None, is_quote=None,
    ignore_quote_filter=True, limit=2000, slim=False, invoice_mode=False,
    audit_mode=True, db=db, current_admin=mock_admin
)

c = 0
for wo in res:
    if wo.get("is_quote") and wo.get("created_at") and wo.get("created_at") >= "2026-08-01":
        c += 1
        print(wo.get("id"), wo.get("recalculated_net"))
print("Total after aug 1 with is_quote:", c)
