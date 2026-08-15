from app.database import SessionLocal
from app.models import WorkOrder
import sys

db = SessionLocal()
wos = db.query(WorkOrder).order_by(WorkOrder.created_at.desc()).limit(5).all()
for wo in wos:
    print(f"ID: {wo.id}, Client: {wo.client_name}, Lang: {wo.client_language}, Created: {wo.created_at}")

db.close()
