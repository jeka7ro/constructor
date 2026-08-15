import sys
import os
sys.path.append(os.path.abspath("backend"))
from app.database import SessionLocal
from app.models import WorkOrder
db = SessionLocal()
quotes = db.query(WorkOrder).filter(WorkOrder.is_quote == True).all()
for q in quotes:
    print(f"ID: {q.id}, Client: {q.client_name}, Approx Date: {q.approximate_date}, Start Date: {q.start_date}, Status: {q.status}")
