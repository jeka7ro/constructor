import os, sys
from dotenv import load_dotenv
load_dotenv(os.path.join(os.getcwd(), 'backend', '.env'))
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from app.database import engine
from sqlalchemy import text
with engine.connect() as conn:
    res = conn.execute(text("SELECT id, name, status, imei FROM saas_app.vehicles WHERE imei IS NOT NULL")).fetchall()
    for row in res:
        print(row)
