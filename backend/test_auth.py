from app.database import SessionLocal
from app.models import Admin
db = SessionLocal()
admin = db.query(Admin).filter(Admin.role == 'SUPER_ADMIN').first()
print("ORG:", admin.organization_id)
