import sys
import os
sys.path.append(os.getcwd() + "/backend")
from app.database import SessionLocal
from app.models import WorkOrder, Team
from app.api.admin_work_orders import update_work_order
from pydantic import BaseModel

db = SessionLocal()
wo = db.query(WorkOrder).filter(WorkOrder.id == "926ac1d2-76f4-461c-9191-c721c21236db").first()
print("WO Team:", wo.assigned_team_id)
if wo.assigned_team_id:
    team = db.query(Team).filter(Team.id == wo.assigned_team_id).first()
    print("Team Base ID:", team.base_id if team else "No team")
print("WO Lat:", wo.site_latitude)
print("WO Lon:", wo.site_longitude)

