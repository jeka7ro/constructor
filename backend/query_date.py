import asyncio
from app.database import SessionLocal
from app.models import WorkOrder, Team

db = SessionLocal()
wos = db.query(WorkOrder).filter(WorkOrder.client_name.ilike('%ISOFLEX%'), WorkOrder.site_address.ilike('%Gentse%')).all()
for w in wos:
    print(f"WO: {w.id} | Client: {w.client_name} | Address: {w.site_address} | Date: {w.start_date} | Team ID: {w.assigned_team_id}")
    team = db.query(Team).filter(Team.id == w.assigned_team_id).first()
    print(f"  Team: {team.name if team else 'None'}")
