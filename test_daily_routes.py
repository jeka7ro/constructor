import sys, os
from dotenv import load_dotenv
load_dotenv(os.path.join(os.getcwd(), 'backend', '.env'))
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy.orm import Session
from app.database import engine
from app.api.admin_logistics import get_daily_routes

class DummyAdmin:
    organization_id = "test_org"

try:
    with Session(engine) as db:
        res = get_daily_routes(target_date="2026-07-14", db=db, admin=DummyAdmin())
        print("Success! Got", len(res.routes), "routes")
except Exception as e:
    import traceback
    traceback.print_exc()
