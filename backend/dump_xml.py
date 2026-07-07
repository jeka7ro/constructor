from app.database import SessionLocal
from app.models import WorkOrder, Client
from app.services.billtobox import generate_efff_xml

db = SessionLocal()
# Fetch the work order that failed: let's pick any recently invoiced work order
wo = db.query(WorkOrder).filter(WorkOrder.is_invoiced == True).order_by(WorkOrder.updated_at.desc()).first()

if wo:
    client = db.query(Client).filter(Client.id == wo.client_id).first() if wo.client_id else None
    xml = generate_efff_xml(wo, client)
    print(xml)
    
    with open("test_invoice.xml", "w") as f:
        f.write(xml)
    print("Saved to test_invoice.xml")
else:
    print("No invoiced work order found.")
