import sys
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import WorkOrder

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

db = SessionLocal()
wos = db.query(WorkOrder).order_by(WorkOrder.created_at.desc()).limit(10).all()

print("Recent Quotes:")
for wo in wos:
    print(f"ID: {wo.external_id}, Client: {wo.client_name}, Source: {wo.source_system}, Created: {wo.created_at}")
