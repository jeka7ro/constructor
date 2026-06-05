import sys
import os
from dotenv import load_dotenv
load_dotenv()
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    db.execute(text("ALTER TABLE saas_app.timesheet_segments ADD COLUMN work_order_id VARCHAR(36) REFERENCES saas_app.work_orders(id) ON DELETE SET NULL;"))
    db.commit()
    print("Added work_order_id successfully!")
except Exception as e:
    print("Error:", e)

