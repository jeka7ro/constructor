import sys
import os
from dotenv import load_dotenv
load_dotenv()
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    db.execute(text("ALTER TABLE saas_app.warehouse_items ADD COLUMN reserved_quantity FLOAT NOT NULL DEFAULT 0.0;"))
    db.commit()
    print("Added reserved_quantity successfully!")
except Exception as e:
    print("Error:", e)

