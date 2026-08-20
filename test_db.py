import os
os.environ["DATABASE_URL"] = "postgresql://postgres.ltxbghtnygnguoegtgfo:30Martie2026!@aws-1-eu-west-2.pooler.supabase.com:6543/postgres"

from sqlalchemy import create_engine, text
try:
    engine = create_engine(os.environ["DATABASE_URL"], connect_args={'connect_timeout': 5})
    with engine.connect() as conn:
        res = conn.execute(text("SELECT table_schema, table_name FROM information_schema.tables WHERE table_name = 'work_orders'"))
        rows = res.fetchall()
        print("TABLES:", rows)
except Exception as e:
    print("ERROR:", e)
