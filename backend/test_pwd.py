import sys
import os
sys.path.append(os.getcwd())
import hashlib
from app.database import SessionLocal
from app.models import Admin
db = SessionLocal()
admin = db.query(Admin).filter_by(email="carabetiulian@gmail.com").first()
if admin:
    # 1. Reset to legacy SHA256 since bcrypt is broken in this environment
    new_hash = hashlib.sha256("123456".encode()).hexdigest()
    admin.password_hash = new_hash
    db.commit()
    print("Password reset to 123456 using SHA256 fallback")
else:
    print("Admin not found")
