import sys
from dotenv import load_dotenv

load_dotenv(".env")
from app.database import SessionLocal
from app.models import LogisticsDailyPlan

db = SessionLocal()
plans = db.query(LogisticsDailyPlan).order_by(LogisticsDailyPlan.date.desc()).limit(5).all()
for p in plans:
    print(f"Date: {p.date}, snapshot type: {type(p.snapshot_data)}")
