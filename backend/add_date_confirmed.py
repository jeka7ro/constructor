import sys
import os
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://postgres.ltxbghtnygnguoegtgfo:30Martie2026!@aws-1-eu-west-2.pooler.supabase.com:6543/postgres"
engine = create_engine(DATABASE_URL)

try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE saas_app.work_orders ADD COLUMN date_confirmed_at TIMESTAMP WITHOUT TIME ZONE;"))
        conn.execute(text("ALTER TABLE saas_app.work_orders ADD COLUMN date_confirmed_ip VARCHAR(50);"))
        conn.commit()
        print("Columns added successfully")
except Exception as e:
    print(f"Error: {e}")
