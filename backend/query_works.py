import asyncio
from app.database import SessionLocal
from app.models import WorkOrder, Team

db = SessionLocal()
teams = db.query(Team).filter(Team.name.ilike('%Vasea%')).all()
for t in teams:
    print(f"Team: {t.name} ({t.id})")
    wos = db.query(WorkOrder).filter(WorkOrder.assigned_team_id == t.id).all()
    for w in wos:
        print(f"  WO: {w.id} | Client: {w.client_name} | Address: {w.site_address} | Date: {w.start_date} | Status: {w.status}")
