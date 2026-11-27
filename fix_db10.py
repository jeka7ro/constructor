from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

DATABASE_URL = "postgresql://postgres.ltxbghtnygnguoegtgfo:30Martie2026!@aws-1-eu-west-2.pooler.supabase.com:6543/postgres"
engine = create_engine(DATABASE_URL)
db = sessionmaker(bind=engine)()

res = db.execute(text("""
SELECT table_name 
FROM information_schema.columns 
WHERE column_name = 'client_id' AND table_schema = 'saas_app'
""")).fetchall()
print("Tables with client_id:", set([r[0] for r in res]))
