import asyncio
from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker
from app.models import User, ConstructionSite
import os
from dotenv import load_dotenv

load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"))
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

total_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar()
total_sites = db.query(func.count(ConstructionSite.id)).scalar()
print("total_users:", total_users)
print("total_sites:", total_sites)
