from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"), isolation_level="AUTOCOMMIT")

with engine.connect() as conn:
    try:
        conn.execute(text('ALTER TABLE warehouse_items ADD COLUMN current_holder_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL;'))
        print("Added current_holder_id to warehouse_items")
    except Exception as e:
        print(f"Error adding current_holder_id: {e}")

    try:
        conn.execute(text('ALTER TABLE warehouse_transactions ADD COLUMN assigned_to_user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL;'))
        print("Added assigned_to_user_id to warehouse_transactions")
    except Exception as e:
        print(f"Error adding assigned_to_user_id: {e}")

print("Done")
