import sys
import os
sys.path.append(os.getcwd())
import hashlib
from app.database import SessionLocal
from app.models import Admin

db = SessionLocal()
admin = db.query(Admin).filter_by(email="carabetiulian@gmail.com").first()
if admin:
    # Use SHA256 fallback since bcrypt is throwing an error in this env
    new_hash = hashlib.sha256("04Iunie2026!".encode()).hexdigest()
    admin.password_hash = new_hash
    db.commit()
    print("Password reset successfully using SHA256")
else:
    print("Admin not found")
