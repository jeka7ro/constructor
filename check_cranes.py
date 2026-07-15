import os, sys
from dotenv import load_dotenv
load_dotenv(os.path.join(os.getcwd(), 'backend', '.env'))
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from app.database import engine
from sqlalchemy import text
with engine.connect() as conn:
    res = conn.execute(text("SELECT id, name, type, status, imei, last_seen_at FROM saas_app.vehicles")).fetchall()
    for row in res:
        print(row)
