import sys
import os
from dotenv import load_dotenv

sys.path.append(os.path.join(os.getcwd(), 'backend'))
load_dotenv(os.path.join(os.getcwd(), 'backend', '.env'))

from app.database import SessionLocal
from app.models import WorkOrder

db = SessionLocal()
wos = db.query(WorkOrder).order_by(WorkOrder.created_at.desc()).limit(10).all()
for wo in wos:
    print(f"ID: {wo.id}, Token: {wo.token}, Quote: {wo.quote_number}, Client: {wo.client_name}, Lang: {wo.client_language}")
db.close()
