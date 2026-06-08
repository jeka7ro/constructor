from app.database import SessionLocal
from app.models import WorkOrder
import json

db = SessionLocal()
wos = db.query(WorkOrder).all()
fixed = 0
for wo in wos:
    if wo.client_name and ("isoflex" in wo.client_name.lower() or "isolteam" in wo.client_name.lower()):
        mats = wo.materials or []
        new_mats = [m for m in mats if m.get("name") not in ["Fibre", "Duramit"]]
        if len(mats) != len(new_mats):
            wo.materials = new_mats
            fixed += 1
db.commit()
print(f"Fixed {fixed} isoflex/isolteam orders.")
db.close()
