import json
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv('backend/.env')
DATABASE_URL = os.getenv('DATABASE_URL')
engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    res = conn.execute(text("SELECT id, title, site_address, site_latitude, site_longitude, route_segments, token FROM saas_app.work_orders WHERE token = '4E6236A9' OR id LIKE '4e6236a9%'"))
    wos = [dict(r._mapping) for r in res]
    
print(json.dumps(wos, indent=2))
