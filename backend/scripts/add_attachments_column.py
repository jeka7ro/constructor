import os
import sys
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

from sqlalchemy import create_engine, text

database_url = os.getenv("DATABASE_URL")
if not database_url:
    print("Error: DATABASE_URL not found.")
    sys.exit(1)

engine = create_engine(database_url)

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE saas_app.work_order_messages ADD COLUMN attachments JSON DEFAULT '[]'::json;"))
        conn.commit()
        print("Successfully added attachments column to work_order_messages")
    except Exception as e:
        print(f"Error adding column: {e}")
