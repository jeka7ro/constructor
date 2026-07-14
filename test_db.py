import sys
import os
from dotenv import load_dotenv
load_dotenv('backend/.env')

sys.path.append(os.path.join(os.getcwd(), 'backend'))
from app.database import SessionLocal
from app.models import WorkOrder
from datetime import date
db = SessionLocal()
wos = db.query(WorkOrder).filter(WorkOrder.start_date == date(2026,7,13)).all()
print(f"Total WOs on 2026-07-13: {len(wos)}")
for wo in wos:
    print(f"{wo.id} | status: {wo.status} | is_quote: {wo.is_quote} | team: {wo.assigned_team_id}")
