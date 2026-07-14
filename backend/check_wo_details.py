from app.database import SessionLocal
from app.models import WorkOrder, Client, ConstructionSite
from datetime import date

db = SessionLocal()
target_date = date(2026, 7, 14)
wos = db.query(WorkOrder).filter(WorkOrder.start_date == target_date).all()
for w in wos:
    site_name = None
    if w.site_id:
        s = db.query(ConstructionSite).filter(ConstructionSite.id == w.site_id).first()
        if s: site_name = s.name
    print(f"WO {w.id[:5]}.. | Client: {w.client_name} | Site: {site_name} | Address: {w.site_address}")
