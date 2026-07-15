import os
import sys
from datetime import date
from dotenv import load_dotenv
load_dotenv(os.path.join(os.getcwd(), 'backend', '.env'))
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.database import engine
from app.models import Admin
from app.api.admin_logistics import _calculate_daily_routes
from sqlalchemy.orm import sessionmaker

Session = sessionmaker(bind=engine)
db = Session()

admin = db.query(Admin).filter(Admin.email == 'carabetiulian@gmail.com').first()
if not admin:
    print("No admin found")
    sys.exit(1)

try:
    print("Calculating daily routes for Iulian...")
    res = _calculate_daily_routes(date.today(), db, admin)
    print("Success! Number of routes:", len(res.get("routes", [])))
except Exception as e:
    import traceback
    traceback.print_exc()

