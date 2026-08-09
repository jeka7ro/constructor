import sys
import os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
from app.database import SessionLocal
from app.models import Admin

db = SessionLocal()
admins = db.query(Admin).all()
for a in admins:
    print(f"Admin: {a.email}, Org ID: {a.organization_id}")
