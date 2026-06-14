import json
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv('backend/.env')
DATABASE_URL = os.getenv('DATABASE_URL')
engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    res = conn.execute(text("SELECT id, name, address FROM saas_app.logistic_sand_stations"))
    db_stations = [dict(r._mapping) for r in res]
    
print(json.dumps(db_stations, indent=2))
