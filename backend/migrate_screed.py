import os
import sys
from sqlalchemy import create_engine, text

# Load .env
from dotenv import load_dotenv
load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("No DATABASE_URL found in .env")
    sys.exit(1)

engine = create_engine(DATABASE_URL)

try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE saas_app.work_orders ADD COLUMN IF NOT EXISTS actual_surface_m2 FLOAT;"))
        conn.execute(text("ALTER TABLE saas_app.work_orders ADD COLUMN IF NOT EXISTS actual_sand_quantity FLOAT;"))
        print("Successfully added columns to saas_app.work_orders table.")
except Exception as e:
    print(f"Error: {e}")
