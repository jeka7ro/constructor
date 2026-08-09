from sqlalchemy.orm import Session
from app.database import get_db, SessionLocal
from app.models import Admin, AuditLog, User
db = SessionLocal()
admin = db.query(Admin).filter(Admin.organization_id != None).first()

# test unique actions
actions = db.query(AuditLog.action).filter(AuditLog.organization_id == admin.organization_id).distinct().all()
print("ACTIONS:", [a[0] for a in actions])

# test unique users
admin_ids = db.query(AuditLog.admin_id).filter(AuditLog.organization_id == admin.organization_id, AuditLog.admin_id != None).distinct().all()
user_ids = db.query(AuditLog.user_id).filter(AuditLog.organization_id == admin.organization_id, AuditLog.user_id != None).distinct().all()

admins = db.query(Admin).filter(Admin.id.in_([a[0] for a in admin_ids])).all()
users = db.query(User).filter(User.id.in_([u[0] for u in user_ids])).all()

user_list = [{"id": a.id, "name": a.full_name or a.email} for a in admins] + [{"id": u.id, "name": u.full_name} for u in users]
print("USERS:", user_list)
