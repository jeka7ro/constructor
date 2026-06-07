import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.database import SessionLocal
from app.models import WorkOrder

db = SessionLocal()
orders = db.query(WorkOrder).all()
found = 0
for wo in orders:
    title = (wo.title or "").lower()
    materials = str(wo.materials).lower()
    volumes = str(wo.volumes).lower()
    
    if "fibre" in title or "duramit" in title or "fibre" in materials or "duramit" in materials or "fibre" in volumes or "duramit" in volumes:
        print(f"ID: {wo.external_id}, Title: {wo.title}\n Mats: {wo.materials}\n Vols: {wo.volumes}\n---")
        found += 1
print(f"Found {found} matches.")
