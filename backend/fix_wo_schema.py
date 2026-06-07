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
        print("Checking work_orders...")
        cur.execute("""
            ALTER TABLE saas_app.work_orders 
            ADD COLUMN IF NOT EXISTS client_language VARCHAR(10) DEFAULT 'ro' NOT NULL;
        """)
        conn.commit()
        print("Updated work_orders!")
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    update_schema()

