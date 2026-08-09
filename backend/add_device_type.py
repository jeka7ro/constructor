import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import engine
from sqlalchemy import text

def add_col():
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE saas_app.audit_logs ADD COLUMN IF NOT EXISTS device_type VARCHAR(50);"))
        print("Done saas_app!")
    except Exception as e:
        print(f"Error saas_app: {e}")
        try:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS device_type VARCHAR(50);"))
            print("Done default!")
        except Exception as e2:
            print(f"Error default: {e2}")

if __name__ == "__main__":
    add_col()
