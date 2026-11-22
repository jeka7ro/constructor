import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
db_url = os.environ.get('DATABASE_URL')
conn = psycopg2.connect(db_url)
conn.autocommit = True
cur = conn.cursor()
try:
    cur.execute("ALTER TABLE saas_app.admins ADD COLUMN color VARCHAR(7);")
    print("Column added to saas_app.admins!")
except Exception as e:
    print(f"Error: {e}")
finally:
    cur.close()
    conn.close()
