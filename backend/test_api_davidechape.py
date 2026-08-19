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
        status="draft,pending,confirmed", start_date=None, end_date=None, is_quote=True,
        ignore_quote_filter=False, limit=None, slim=True, invoice_mode=False,
        audit_mode=False, db=db, current_admin=mock_admin
    )
    print("API returned:", len(res))
    
    # Filter exactly as JS does
    valid_quotes = [q for q in res if q.get('status') not in ('cancelled', 'planning') and not q.get('start_date')]
    print("Valid quotes (JS filter logic):", len(valid_quotes))
    
    if len(valid_quotes) > 0:
        print("First quote:", json.dumps(valid_quotes[0], indent=2))
        
except Exception as e:
    import traceback
    traceback.print_exc()
