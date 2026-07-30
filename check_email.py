import os
import psycopg2
from dotenv import load_dotenv

load_dotenv('backend/.env')
conn = psycopg2.connect(os.environ['DATABASE_URL'])
cur = conn.cursor()
try:
    cur.execute("SELECT id, client_name, client_email FROM saas_app.work_orders WHERE client_name ILIKE '%Eugeniu Cazmal%';")
    rows = cur.fetchall()
    print("Work Orders:", rows)
except Exception as e:
    print(f"Error: {e}")
finally:
    cur.close()
    conn.close()
