import os
import json
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()
engine = create_engine(os.environ['DATABASE_URL'])
with engine.connect() as conn:
    res = conn.execute(text('SELECT truck_extra_price_flat, truck_distance_threshold_km, truck_surface_threshold_free_sqm FROM saas_app.pricing_settings LIMIT 1'))
    row = res.fetchone()
    print(json.dumps({"flat": row[0], "dist": row[1], "surf": row[2]}))
