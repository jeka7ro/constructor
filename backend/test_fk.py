from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"))

with engine.connect() as conn:
    c_sites = conn.execute(text("SELECT id, name FROM construction_sites WHERE name='eugen'")).fetchall()
    print("construction_sites:", c_sites)
    sites = conn.execute(text("SELECT id, name FROM sites WHERE name='eugen'")).fetchall()
    print("sites:", sites)

