import json
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv('backend/.env')
DATABASE_URL = os.getenv('DATABASE_URL')
engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    res = conn.execute(text("SELECT t.name, t.base_id, b.name as base_name, b.latitude, b.longitude FROM saas_app.teams t LEFT JOIN saas_app.logistic_bases b ON t.base_id = b.id WHERE t.name ILIKE '%vasea%'"))
    teams = [dict(r._mapping) for r in res]
    
print(json.dumps(teams, indent=2))
