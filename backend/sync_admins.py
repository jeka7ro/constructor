import sys
import hashlib
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Admin, User, Role
import uuid

def hash_pin(pin: str) -> str:
    return hashlib.sha256(pin.encode()).hexdigest()

def main():
    db = SessionLocal()
    try:
        admins = db.query(Admin).filter(Admin.is_super_admin == False).all()
        for admin in admins:
            user = db.query(User).filter(User.email == admin.email).first()
            if not user:
                role = db.query(Role).filter(
                    Role.organization_id == admin.organization_id,
                    Role.name == "Administrator"
                ).first()
                if not role:
                    print(f"Creating Role Administrator for org {admin.organization_id}")
                    role = Role(
                        id=str(uuid.uuid4()),
                        organization_id=admin.organization_id,
                        code="admin",
                        name="Administrator",
                        is_employee=False,
                        is_active=True
                    )
                    db.add(role)
                    db.commit()
                    db.refresh(role)
                
                existing_codes = db.query(User.employee_code).filter(
                    User.employee_code.ilike("EMP%")
                ).all()
                import re
                max_num = 0
                for (code,) in existing_codes:
                    match = re.search(r'EMP(\d+)', code, re.IGNORECASE)
                    if match:
                        num = int(match.group(1))
                        if num > max_num:
                            max_num = num
                next_code = f"EMP{max_num + 1:03d}"
                
                new_user = User(
                    id=str(uuid.uuid4()),
                    organization_id=admin.organization_id,
                    employee_code=next_code,
                    full_name=admin.full_name,
                    email=admin.email,
                    role_id=role.id,
                    pin_hash=hash_pin("1234"),
                    is_active=admin.is_active
                )
                db.add(new_user)
                db.commit()
                print(f"Created User for {admin.email} (Code: {next_code})")
    finally:
        db.close()

if __name__ == "__main__":
    main()
