import asyncio
from app.database import engine
from sqlalchemy.orm import sessionmaker
from app.models import Admin, WorkOrder
from sqlalchemy import text

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

partner = db.query(Admin).filter(Admin.email == 'eugen1ro@gmail.com').first()
print("Partner client_id:", partner.client_id)

orders = db.query(WorkOrder).filter(WorkOrder.client_id == partner.client_id).all()
print("Orders found:", len(orders))
