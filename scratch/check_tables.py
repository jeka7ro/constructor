from sqlalchemy import create_engine, inspect
DATABASE_URL = "postgresql://postgres.ltxbghtnygnguoegtgfo:30Martie2026!@aws-1-eu-west-2.pooler.supabase.com:6543/postgres"
engine = create_engine(DATABASE_URL)
inspector = inspect(engine)
print(inspector.get_table_names())
