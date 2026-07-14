from app.database import SessionLocal
from app.models import WorkOrder, Client
from datetime import date

db = SessionLocal()
target_date = date(2026, 7, 14)
wos = db.query(WorkOrder).filter(WorkOrder.start_date == target_date).all()
for w in wos:
    client_db_name = None
    if w.client_id:
        c = db.query(Client).filter(Client.id == w.client_id).first()
        if c:
            client_db_name = c.name
    print(f"WO ID: {w.id} | title: {w.title} | client_name (on WO): {w.client_name} | client_db_name: {client_db_name}")
