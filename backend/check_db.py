from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")
if db_url and db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

engine = create_engine(db_url)
with engine.connect() as conn:
    print("\n--- WORK ORDERS FOR ISOFLEX IN LATE AUGUST 2026 ---")
    wos = conn.execute(text("SELECT id, title, start_date FROM saas_app.work_orders WHERE client_id = 'a58df692-672f-459e-9c19-4b501b72bee1' AND start_date >= '2026-08-20' AND start_date <= '2026-08-31'")).fetchall()
    for w in wos:
        print(w)
