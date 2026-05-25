import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"))

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE admins ADD COLUMN role VARCHAR(50) DEFAULT 'ADMIN'"))
        print("Added role to admins")
    except Exception as e:
        print(f"Admins role: {e}")

    try:
        conn.execute(text("ALTER TABLE warehouse_items ADD COLUMN current_site_id VARCHAR(36) REFERENCES sites(id) ON DELETE SET NULL"))
        print("Added current_site_id to warehouse_items")
    except Exception as e:
        print(f"warehouse_items current_site_id: {e}")

    try:
        conn.execute(text("ALTER TABLE warehouse_items ADD COLUMN is_defective BOOLEAN DEFAULT FALSE"))
        print("Added is_defective to warehouse_items")
    except Exception as e:
        print(f"warehouse_items is_defective: {e}")
    conn.commit()
