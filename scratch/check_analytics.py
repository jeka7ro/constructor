import sys
import os
from dotenv import load_dotenv
load_dotenv('backend/.env')

sys.path.append(os.path.abspath('backend'))
from app.database import SessionLocal
from app.models import Organization, Admin
from app.api.admin_work_orders import list_work_orders
from pydantic import BaseModel
import json

class MockAdmin(BaseModel):
    organization_id: str
    id: str = "admin_123"

db = SessionLocal()
org = db.query(Organization).filter(Organization.slug == 'davidechape').first()
mock_admin = MockAdmin(organization_id=org.id)

try:
    res = list_work_orders(
        status=None, start_date=None, end_date=None, is_quote=None,
        ignore_quote_filter=False, limit=500, slim=False, invoice_mode=False,
        audit_mode=True, db=db, current_admin=mock_admin
    )
    for q in res:
        diff = float(q.get('calcNet', 0)) - float(q.get('savedNet', 0))
        if q.get('client_name') == 'Eugeniu Cazmal' and q.get('savedNet') == 8035.00:
            print("FOUND IT!")
            print("Saved Net:", q.get('savedNet'))
            print("Calc Net:", q.get('calcNet'))
            print("Recalculated Items:", json.dumps(q.get('recalculated_items', []), indent=2))
            break
except Exception as e:
    import traceback
    traceback.print_exc()
