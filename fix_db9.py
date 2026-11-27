from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

DATABASE_URL = "postgresql://postgres.ltxbghtnygnguoegtgfo:30Martie2026!@aws-1-eu-west-2.pooler.supabase.com:6543/postgres"
engine = create_engine(DATABASE_URL)
db = sessionmaker(bind=engine)()

res = db.execute(text("""
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_roles' AND table_schema = 'saas_app'
""")).fetchall()
print("user_roles columns:")
for r in res:
    print(r)

res2 = db.execute(text("""
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'client_users' OR table_name = 'partner_users' OR table_name = 'users_clients'
""")).fetchall()
print("association table columns:")
for r in res2:
    print(r)

