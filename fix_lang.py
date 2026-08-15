from backend.app.database import SessionLocal
from backend.app.models import WorkOrder
import sys

db = SessionLocal()
wos = db.query(WorkOrder).order_by(WorkOrder.created_at.desc()).limit(3).all()
for wo in wos:
    print(f"ID: {wo.id}, Client: {wo.client_name}, Lang: {wo.client_language}")
    if wo.client_language == 'fr':
        print(f"Changing {wo.id} to en")
        wo.client_language = 'en'

db.commit()
db.close()
