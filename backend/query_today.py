import asyncio
from app.database import SessionLocal
from app.models import WorkOrder, Team

db = SessionLocal()
wos = db.query(WorkOrder).filter(WorkOrder.start_date == '2026-07-14', WorkOrder.assigned_team_id == '34a8ae14-429f-4bdb-a168-d475ef17c1df').all()
for w in wos:
    print(f"WO: {w.id} | Client: {w.client_name} | ClientID: {w.client_id} | SiteID: {w.site_id} | Address: {w.site_address} | Status: {w.status}")
