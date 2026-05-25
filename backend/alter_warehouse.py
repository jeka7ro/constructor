import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def add_columns():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE warehouse_items ADD COLUMN model VARCHAR(255);"))
            print("Added model")
        except Exception as e:
            print("model error:", e)
            
        try:
            conn.execute(text("ALTER TABLE warehouse_items ADD COLUMN inventory_code VARCHAR(100);"))
            print("Added inventory_code")
        except Exception as e:
            print("inventory_code error:", e)

        try:
            conn.execute(text("ALTER TABLE warehouse_items ADD COLUMN current_holder_id VARCHAR(36);"))
            print("Added current_holder_id")
        except Exception as e:
            print("current_holder_id error:", e)

        try:
            conn.execute(text("ALTER TABLE warehouse_items ADD COLUMN checked_out_at TIMESTAMP;"))
            print("Added checked_out_at")
        except Exception as e:
            print("checked_out_at error:", e)

        conn.commit()

if __name__ == "__main__":
    add_columns()
