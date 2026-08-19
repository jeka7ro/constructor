import os
os.environ["DATABASE_URL"] = "postgresql://postgres.ltxbghtnygnguoegtgfo:30Martie2026!@aws-1-eu-west-2.pooler.supabase.com:6543/postgres"
from sqlalchemy import create_engine
engine = create_engine(os.environ["DATABASE_URL"])
with engine.connect() as conn:
    result = conn.execute("SELECT count(*) FROM work_orders")
    print(f"WorkOrders count: {result.scalar()}")
