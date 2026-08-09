import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import engine
from sqlalchemy import text

def run():
    queries = [
        "ALTER TABLE saas_app.pricing_settings ADD COLUMN IF NOT EXISTS truck_surface_threshold_free_sqm FLOAT DEFAULT 500.0;"
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
