import os
import psycopg2
from dotenv import load_dotenv

load_dotenv('backend/.env')
conn = psycopg2.connect(os.environ['DATABASE_URL'])
cur = conn.cursor()
cur.execute("SELECT client_email, client_phone FROM saas_app.work_orders WHERE id = 'bb971555-6d81-4e6d-874f-f9588e9d21ce'")
row = cur.fetchone()
print(row if row else "NOT FOUND")
