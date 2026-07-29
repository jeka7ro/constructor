import os
import psycopg2
from dotenv import load_dotenv

load_dotenv('backend/.env')
conn = psycopg2.connect(os.environ['DATABASE_URL'])
cur = conn.cursor()
try:
    cur.execute("SELECT id, client_name, status, is_quote FROM saas_app.work_orders WHERE status IN ('draft', 'pending') AND client_name = 'Eugeniu Cazmal';")
    rows = cur.fetchall()
    print("TOTAL ROWS:", len(rows))
    for r in rows:
        print(r)
except Exception as e:
    print(e)
finally:
    conn.close()
