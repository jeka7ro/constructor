import os
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import User, Role

db = SessionLocal()
users = db.query(User).filter(User.full_name.ilike('%Petrea%')).all()
for u in users:
    role = db.query(Role).filter(Role.id == u.role_id).first()
    print(f"User: {u.full_name}, Role: {role.name if role else 'None'}, RoleCode: {role.code if role else 'None'}")
