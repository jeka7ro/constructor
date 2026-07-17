import sys
from datetime import datetime
from app.db.database import SessionLocal
from app.api.admin_logistics import _calculate_daily_routes

class DummyAdmin:
    tenant_id = None

db = SessionLocal()
try:
    _calculate_daily_routes(datetime.now().date(), db, DummyAdmin())
    db.commit()
    print("Recalculated routes successfully.")
except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
