import os
import psycopg2
from dotenv import load_dotenv

load_dotenv('backend/.env')
conn = psycopg2.connect(os.environ['DATABASE_URL'])
cur = conn.cursor()
try:
    cur.execute("ALTER TABLE saas_app.work_orders ADD COLUMN client_notified BOOLEAN NOT NULL DEFAULT FALSE;")
    conn.commit()
    print("Column added successfully")
except Exception as e:
    print(f"Error: {e}")
finally:
    cur.close()
    conn.close()
