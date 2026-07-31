from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"))
with engine.connect() as conn:
    conn.execute(text("ALTER TABLE saas_app.work_orders ADD COLUMN IF NOT EXISTS is_chat_closed BOOLEAN NOT NULL DEFAULT FALSE;"))
    conn.commit()
    print("Column added successfully!")
