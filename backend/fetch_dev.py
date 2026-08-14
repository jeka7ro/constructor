import os
import json
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()
engine = create_engine(os.environ['DATABASE_URL'])
with engine.connect() as conn:
    res = conn.execute(text("SELECT quote_number, prices, proforma_data, source_system, route_distance_km FROM saas_app.work_orders WHERE quote_number LIKE '%0905%' LIMIT 1"))
    row = res.fetchone()
    if row:
        print("Quote:", row[0])
        print("Source:", row[3])
        print("route_distance_km:", row[4])
        print("Prices:", json.dumps(row[1]) if row[1] else "None")
    else:
        print("Not found")
