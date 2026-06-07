import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

try:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    cur.execute("""
        ALTER TABLE saas_app.work_orders
        ADD COLUMN IF NOT EXISTS external_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS source_system VARCHAR(50) DEFAULT 'manual';
    """)

    conn.commit()
    print("Columns external_id and source_system added to work_orders.")

except Exception as e:
    print(f"Error: {e}")
finally:
    if 'conn' in locals():
        cur.close()
        conn.close()
