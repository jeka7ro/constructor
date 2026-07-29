import requests
import json
import os
from dotenv import load_dotenv

load_dotenv('backend/.env')
# I'll query the DB using SQLAlchemy just like FastAPI does to see EXACTLY what it returns
import psycopg2
conn = psycopg2.connect(os.environ['DATABASE_URL'])
cur = conn.cursor()
cur.execute("SELECT id, client_name, status, is_quote FROM saas_app.work_orders WHERE status IN ('draft', 'pending') AND is_quote = True ORDER BY start_date DESC NULLS LAST, created_at DESC;")
rows = cur.fetchall()
for r in rows:
    print(r)
