import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")
if db_url:
    engine = create_engine(db_url)
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE organizations ALTER COLUMN logo_url TYPE TEXT;"))
        conn.execute(text("ALTER TABLE organizations ALTER COLUMN favicon_url TYPE TEXT;"))
        conn.commit()
    print("Columns altered successfully to TEXT.")
else:
    print("No DATABASE_URL found.")
