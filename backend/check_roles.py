import sys
import os
from dotenv import load_dotenv
load_dotenv()
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import SessionLocal
from app.models import Role, Organization

db = SessionLocal()
orgs = db.query(Organization).all()
print("Organizations:")
for o in orgs:
    print(f"ID: {o.id}, Name: {o.name}")

roles = db.query(Role).all()
print("\nRoles:")
for r in roles:
    print(f"ID: {r.id}, Name: {r.name}, OrgID: {r.organization_id}")
