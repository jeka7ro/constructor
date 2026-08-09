import sys
import os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
from app.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    db.execute(text("ALTER TABLE saas_app.admins ADD COLUMN receive_quote_alerts BOOLEAN DEFAULT FALSE;"))
    db.commit()
    print("Added receive_quote_alerts to saas_app.admins table.")
except Exception as e:
    print(f"Error: {e}")
    db.rollback()
