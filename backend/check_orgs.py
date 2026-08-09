import sys
from app.database import SessionLocal
from app.models import Organization, Admin
db = SessionLocal()
admin = db.query(Admin).filter(Admin.email == 'jeka7ro@gmail.com').first()
print(f"Admin: {admin.email} (role: {admin.role}, org: {admin.organization_id})")
orgs = db.query(Organization).all()
print(f"Total Orgs: {len(orgs)}")
for org in orgs:
    print(f"- {org.name} (slug: {org.slug})")
