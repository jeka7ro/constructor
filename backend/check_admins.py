import sys
import os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
from app.database import SessionLocal
from app.models import Admin, User

db = SessionLocal()
admins = db.query(Admin).all()
print(f"Total Admins: {len(admins)}")
for a in admins:
    print(f"Admin ID: {a.id}, Email: {a.email}, Role: {a.role if hasattr(a, 'role') else 'N/A'}")

users = db.query(User).all()
print(f"\nTotal Users: {len(users)}")
for u in users:
    if "iulian" in (u.email or "").lower() or "corina" in (u.email or "").lower():
        print(f"User ID: {u.id}, Email: {u.email}, Role: {u.role if hasattr(u, 'role') else 'N/A'}")
