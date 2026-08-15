import sys
import os
sys.path.append(os.path.abspath("backend"))
from app.database import SessionLocal
from app.models import WorkOrder
db = SessionLocal()
wo = db.query(WorkOrder).first()
print(wo.id)
