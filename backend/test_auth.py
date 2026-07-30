import sys
import os
sys.path.append(os.getcwd())
import bcrypt
from app.database import SessionLocal
from app.models import Admin
db = SessionLocal()
admin = db.query(Admin).filter_by(email="carabetiulian@gmail.com").first()
if admin:
    salt = bcrypt.gensalt()
    admin.password_hash = bcrypt.hashpw("123456".encode('utf-8'), salt).decode('utf-8')
    db.commit()
    print("Password reset to 123456")
else:
    print("Admin not found")
