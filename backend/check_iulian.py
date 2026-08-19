from app.database import SessionLocal
from app.models import Admin, Organization, WorkOrder
db = SessionLocal()
iulian = db.query(Admin).filter(Admin.full_name.ilike('%Iulian Carabet%')).first()
if iulian:
    print(f"Found Iulian: email={iulian.email}, role={iulian.role}, org_id={iulian.organization_id}")
    org = db.query(Organization).filter(Organization.id == iulian.organization_id).first() if iulian.organization_id else None
    print(f"Org: {org.name if org else 'None'}")
    
    # Check quotes for Iulian's org
    if iulian.organization_id:
        pending = db.query(WorkOrder).filter(
            WorkOrder.organization_id == iulian.organization_id,
            WorkOrder.is_quote == True,
            WorkOrder.status.in_(['draft', 'pending', 'confirmed'])
        ).count()
        print(f"Pending quotes for Iulian's org: {pending}")
else:
    print("Iulian not found!")
