import json
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv('backend/.env')
DATABASE_URL = os.getenv('DATABASE_URL')
engine = create_engine(DATABASE_URL)

with open('scratch_stations.json', 'r') as f:
    geocoded = json.load(f)

# Create a mapping from name to address
name_to_address = {s['name']: s['address'] for s in geocoded}

with engine.connect() as conn:
    # Begin transaction
    with conn.begin():
        for name, address in name_to_address.items():
            if address:
                conn.execute(
                    text("UPDATE saas_app.logistic_sand_stations SET address = :address WHERE name = :name"),
                    {"address": address, "name": name}
                )
    print("Database updated successfully!")
