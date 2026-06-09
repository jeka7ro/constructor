from app.database import SessionLocal
from app.models import Admin

db = SessionLocal()
admins = db.query(Admin).all()
for a in admins:
    print(a.id, a.email, a.organization_id)
