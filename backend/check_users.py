import sys
import os
from dotenv import load_dotenv
load_dotenv()
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import SessionLocal
from app.models import User, Role

db = SessionLocal()
users = db.query(User).all()
print(f"Total users: {len(users)}")
for u in users:
    role_name = u.role.name if u.role else 'None'
    print(f"ID: {u.id}, Name: {u.full_name}, Code: {u.employee_code}, Role: {role_name}, OrgID: {u.organization_id}")
