import os
import psycopg2
from urllib.parse import urlparse
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    db_url = os.getenv("DATABASE_URL")
    if not db_url: return None
    result = urlparse(db_url)
    return psycopg2.connect(
        database=result.path[1:],
        user=result.username,
        password=result.password,
        host=result.hostname,
        port=result.port
    )

def update_schema():
    conn = get_db_connection()
    if not conn: return
    try:
        cur = conn.cursor()
        print("Checking other work_orders fields...")
        cur.execute("""
            ALTER TABLE saas_app.work_orders ADD COLUMN IF NOT EXISTS site_latitude FLOAT;
            ALTER TABLE saas_app.work_orders ADD COLUMN IF NOT EXISTS site_longitude FLOAT;
            ALTER TABLE saas_app.work_orders ADD COLUMN IF NOT EXISTS site_geofence_radius INTEGER DEFAULT 100;
            ALTER TABLE saas_app.work_orders ADD COLUMN IF NOT EXISTS actual_surface_m2 FLOAT;
            ALTER TABLE saas_app.work_orders ADD COLUMN IF NOT EXISTS actual_sand_quantity FLOAT;
        """)
        conn.commit()
        print("Updated work_orders fields!")
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    update_schema()

