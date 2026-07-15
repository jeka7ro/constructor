import sys
import os
from datetime import date
from dotenv import load_dotenv
load_dotenv(".env")

from app.database import SessionLocal
from app.models import Admin
from app.api.admin_logistics import _calculate_daily_routes

db = SessionLocal()
admin = db.query(Admin).first()
if not admin:
    print("No admin")
    sys.exit(1)

try:
    _calculate_daily_routes(date(2026, 7, 14), db, admin)
    print("Success")
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
