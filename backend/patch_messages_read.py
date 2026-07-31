import os
import sys
import sqlite3
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import engine

def patch_db():
    print("Adding is_read_by_admin column...")
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE saas_app.work_order_messages ADD COLUMN is_read_by_admin BOOLEAN DEFAULT false"))
            conn.commit()
            print("Column added successfully.")
        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                print("Column already exists.")
            else:
                print(f"Error patching database: {e}")

if __name__ == "__main__":
    patch_db()
