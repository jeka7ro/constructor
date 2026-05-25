from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"))

with engine.connect() as conn:
    res = conn.execute(text("SELECT name, total_quantity, current_holder_id, current_site_id FROM warehouse_items WHERE inventory_code IS NOT NULL")).fetchall()
    print(res)

