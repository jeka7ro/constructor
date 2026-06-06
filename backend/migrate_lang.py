import os
import sys
from dotenv import load_dotenv

load_dotenv()

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), ".")))

from sqlalchemy import text
from app.database import engine

def migrate():
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE saas_app.clients ADD COLUMN preferred_language VARCHAR(10) DEFAULT 'ro' NOT NULL;"))
            print("Added preferred_language to saas_app.clients")
        except Exception as e:
            print(f"clients error (might exist): {e}")

        try:
            conn.execute(text("ALTER TABLE saas_app.work_orders ADD COLUMN client_language VARCHAR(10) DEFAULT 'ro' NOT NULL;"))
            print("Added client_language to saas_app.work_orders")
        except Exception as e:
            print(f"work_orders error (might exist): {e}")

if __name__ == "__main__":
    migrate()
