import sys
from sqlalchemy import text
from app.database import engine

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE saas_app.work_orders ADD COLUMN route_segments JSON DEFAULT '[]'::json;"))
        conn.commit()
        print("Added route_segments column!")
    except Exception as e:
        print(f"Error: {e}")
