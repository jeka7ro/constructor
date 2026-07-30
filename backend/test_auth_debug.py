import sys
import os
sys.path.append(os.getcwd())
import hashlib
from app.database import SessionLocal
from app.models import Admin
from app.api.admin_auth import verify_password

db = SessionLocal()
admin = db.query(Admin).filter_by(email="carabetiulian@gmail.com").first()
if admin:
    print(f"Admin found: {admin.email}")
    print(f"is_active: {admin.is_active}")
    print(f"Hash length: {len(admin.password_hash)}")
    print(f"Hash: {admin.password_hash}")
    plain = "04Iunie2026!"
    print(f"Verify result for '04Iunie2026!': {verify_password(plain, admin.password_hash)}")
else:
    print("Admin not found")
