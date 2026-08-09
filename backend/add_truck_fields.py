import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import engine
from sqlalchemy import text

def run():
    queries = [
        "ALTER TABLE saas_app.pricing_settings ADD COLUMN IF NOT EXISTS truck_base_address TEXT;",
        "ALTER TABLE saas_app.pricing_settings ADD COLUMN IF NOT EXISTS truck_distance_threshold_km FLOAT DEFAULT 50.0;",
        "ALTER TABLE saas_app.pricing_settings ADD COLUMN IF NOT EXISTS truck_extra_price_flat FLOAT DEFAULT 0.0;"
    ]
    for q in queries:
        try:
            with engine.begin() as conn:
                conn.execute(text(q))
            print(f"Executed: {q}")
        except Exception as e:
            print(f"Failed {q}: {e}")

if __name__ == "__main__":
    run()
