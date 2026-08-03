import os
from dotenv import load_dotenv
load_dotenv(".env")
from sqlalchemy import text
from app.database import engine

def migrate():
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE saas_app.work_order_messages ADD COLUMN is_hidden BOOLEAN DEFAULT FALSE;"))
            print("Successfully added is_hidden column.")
        except Exception as e:
            print(f"Migration error: {e}")

if __name__ == "__main__":
    migrate()
