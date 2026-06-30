import sys
import os
import hashlib

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import Admin

def reset_password(email: str, new_password: str):
    db = SessionLocal()
    admin = db.query(Admin).filter(Admin.email == email).first()
    
    if not admin:
        print(f"❌ Admin with email {email} not found!")
        return
        
    try:
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        admin.password_hash = pwd_context.hash(new_password)
    except ImportError:
        admin.password_hash = hashlib.sha256(new_password.encode()).hexdigest()

    db.commit()
    print(f"✅ Password for {email} has been reset successfully!")
    db.close()

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python reset_admin_pwd.py <email> <new_password>")
    else:
        reset_password(sys.argv[1], sys.argv[2])
