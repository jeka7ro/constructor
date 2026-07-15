import os
from dotenv import load_dotenv
load_dotenv("backend/.env")

from app.database import SessionLocal
from app.models import WorkOrder, Client, Team
from datetime import date
from sqlalchemy import inspect

db = SessionLocal()
wos = db.query(WorkOrder).filter(WorkOrder.start_date == date(2026, 7, 14)).all()
for w in wos:
    team = db.query(Team).filter(Team.id == w.assigned_team_id).first() if w.assigned_team_id else None
    team_name = team.name if team else "None"
    client = db.query(Client).filter(Client.id == w.client_id).first() if w.client_id else None
    print(f"WO {w.id}: Team={team_name}, Client_Name_Field={w.client_name}, Client_ID={w.client_id}, Client_From_DB={client.name if client else 'None'}, Title={w.title}")
db.close()
