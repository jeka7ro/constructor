import sys
import os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
from app.database import SessionLocal
from app.models import Admin

db = SessionLocal()
try:
    admin = db.query(Admin).filter(Admin.email == 'avbuild1@gmail.com').first()
    if admin:
        admin.receive_quote_alerts = True
        db.commit()
        print("Enabled quote alerts for avbuild1@gmail.com")
except Exception as e:
    print(f"Error: {e}")
    db.rollback()
