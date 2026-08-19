from app.database import SessionLocal
from app.models import Admin, WorkOrder

db = SessionLocal()
admin = db.query(Admin).filter(Admin.email == 'jeka7ro@gmail.com').first()
if not admin: admin = db.query(Admin).first()

org_id = admin.organization_id
print("Org ID:", org_id)

wos = db.query(WorkOrder).filter(WorkOrder.organization_id == org_id).count()
print("WorkOrders for this org:", wos)
