import sys
import os
from dotenv import load_dotenv
load_dotenv()
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import SessionLocal
from app.models import Role, User, Organization
import uuid

db = SessionLocal()

davide_org_id = '84b73e6b-8e3c-45f6-b133-9e19d41a1bf2'

# Ensure roles exist for Davide Chape
roles_to_create = [
    {"code": "WORKER", "name": "Muncitor", "is_employee": True},
    {"code": "DRIVER", "name": "Sofer", "is_employee": True},
    {"code": "TEAM_LEAD", "name": "Sef Echipa", "is_employee": True}
]

role_map = {}
for r_data in roles_to_create:
    existing = db.query(Role).filter_by(organization_id=davide_org_id, code=r_data["code"]).first()
    if not existing:
        new_role = Role(
            id=str(uuid.uuid4()),
            organization_id=davide_org_id,
            code=r_data["code"],
            name=r_data["name"],
            is_employee=r_data["is_employee"]
        )
        db.add(new_role)
        db.commit()
        db.refresh(new_role)
        role_map[r_data["name"]] = new_role.id
    else:
        role_map[r_data["name"]] = existing.id

# Fix the 4 users
users_to_fix = ["Badea DAF", "Vasea DAF", "Petrea Man", "Sasha Renault"]
users = db.query(User).filter(User.full_name.in_(users_to_fix)).all()

for u in users:
    # get the role name from the old role
    old_role = db.query(Role).filter_by(id=u.role_id).first()
    role_name = old_role.name if old_role else "Muncitor"
    
    if role_name in role_map:
        new_role_id = role_map[role_name]
    else:
        new_role_id = role_map["Muncitor"]

    u.organization_id = davide_org_id
    u.role_id = new_role_id

db.commit()
print("Fixed successfully!")
