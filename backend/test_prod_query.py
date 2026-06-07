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

def test_query():
    conn = get_db_connection()
    if not conn: return
    try:
        cur = conn.cursor()
        print("Testing select from work_orders...")
        cur.execute("SELECT id, title, client_language FROM saas_app.work_orders LIMIT 1;")
        print("WorkOrder:", cur.fetchone())
        
        print("Testing select from clients...")
        cur.execute("SELECT id, name, client_type, swift FROM saas_app.clients LIMIT 1;")
        print("Client:", cur.fetchone())
    except Exception as e:
        print(f"Error: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    test_query()

