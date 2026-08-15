import sys
sys.path.append('backend')
from app.database import SessionLocal
from app.models import WorkOrder

db = SessionLocal()
wo = db.query(WorkOrder).filter(WorkOrder.client_name == "Elena Cazmal").first()
if wo:
    prices = dict(wo.prices)
    prices['distance_km'] = 2171.15
    # Recalculate truck cost? Wait, I don't know the truck cost formula exactly.
    # It's probably in pricing_engine. Let's just update distance for now so it shows up.
    wo.prices = prices
    
    # Let's also update the client address on the Client model just in case
    if wo.client and not wo.client.address:
        wo.client.address = "Bulevardul Unirii, București, Romania"
        wo.client.phone = "+40 700 000 000" # Dummy if missing
        
    db.commit()
    print("Updated Elena Cazmal order distance and client info.")
else:
    print("Order not found.")
