from app.database import SessionLocal
from app.models import Organization, Admin, WorkOrder

db = SessionLocal()
org = db.query(Organization).filter(Organization.slug == 'davidechape').first()
print("Davidechape Org ID:", org.id if org else None)

if org:
    wos = db.query(WorkOrder).filter(WorkOrder.organization_id == org.id).count()
    print("WorkOrders for davidechape:", wos)
    
    pending = db.query(WorkOrder).filter(
        WorkOrder.organization_id == org.id,
        WorkOrder.is_quote == True,
        WorkOrder.status.in_(['draft', 'pending', 'confirmed'])
    ).count()
    print("Pending quotes for davidechape:", pending)
    
    pending_items = db.query(WorkOrder).filter(
        WorkOrder.organization_id == org.id,
        WorkOrder.is_quote == True,
        WorkOrder.status.in_(['draft', 'pending', 'confirmed'])
    ).all()
    
    for wo in pending_items:
        print(f"{wo.id} - start_date={wo.start_date}")
