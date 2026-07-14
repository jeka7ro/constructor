import sys
import os
sys.path.append('/Users/eugeniucazmal/Downloads/dev_office/Client B - pontaje/backend')
from app.db.session import SessionLocal
from app.models import Organization
from app.api.admin_logistics import _calculate_daily_routes
import datetime

db = SessionLocal()
org = db.query(Organization).first()
class MockAdmin:
    organization_id = org.id

try:
    data = _calculate_daily_routes(datetime.date(2026, 7, 13), db, MockAdmin())
    print("SUCCESS", len(data['routes']))
except Exception as e:
    import traceback
    traceback.print_exc()
