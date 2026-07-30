import sys
import os
sys.path.append(os.getcwd())
from app.database import SessionLocal
from app.models import Admin

db = SessionLocal()
super_admins = db.query(Admin).filter_by(is_super_admin=True).all()
for sa in super_admins:
    print(f"Super Admin: {sa.email}")
