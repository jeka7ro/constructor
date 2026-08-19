import os
os.environ["DATABASE_URL"] = "postgresql://postgres:30Martie2026!@db.ltxbghtnygnguoegtgfo.supabase.co:5432/postgres"

from sqlalchemy import create_engine, text
try:
    engine = create_engine(os.environ["DATABASE_URL"], connect_args={'connect_timeout': 5})
    with engine.connect() as conn:
        res = conn.execute(text("SELECT count(*) FROM work_orders"))
        print("COUNT:", res.scalar())
except Exception as e:
    print("ERROR:", e)
