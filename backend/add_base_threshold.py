import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import engine
from sqlalchemy import text

def run():
    queries = [
        "ALTER TABLE saas_app.pricing_settings ADD COLUMN IF NOT EXISTS base_price_sqm_large FLOAT DEFAULT 12.5;",
        "ALTER TABLE saas_app.pricing_settings ADD COLUMN IF NOT EXISTS base_large_threshold_sqm FLOAT DEFAULT 200.0;",
        "ALTER TABLE pricing_settings ADD COLUMN IF NOT EXISTS base_price_sqm_large FLOAT DEFAULT 12.5;",
        "ALTER TABLE pricing_settings ADD COLUMN IF NOT EXISTS base_large_threshold_sqm FLOAT DEFAULT 200.0;"
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
