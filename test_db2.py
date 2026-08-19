import os
os.environ["DATABASE_URL"] = "postgresql://postgres.ltxbghtnygnguoegtgfo:30Martie2026!@aws-0-eu-west-2.pooler.supabase.com:6543/postgres"

from sqlalchemy import create_engine, text
try:
    engine = create_engine(os.environ["DATABASE_URL"], connect_args={'connect_timeout': 5, 'sslmode': 'require'})
    with engine.connect() as conn:
        res = conn.execute(text("SELECT count(*) FROM work_orders"))
        print("COUNT SSL:", res.scalar())
except Exception as e:
    print("ERROR:", e)
