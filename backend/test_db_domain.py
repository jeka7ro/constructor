import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DB_URL = "postgresql://postgres.ltxbghtnygnguoegtgfo:30Martie2026!@aws-1-eu-west-2.pooler.supabase.com:6543/postgres"
engine = create_engine(DB_URL)
Session = sessionmaker(bind=engine)
session = Session()

res = session.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'organizations'"))
for r in res:
    print(r)
