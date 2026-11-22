from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

DATABASE_URL = "postgresql://postgres.ltxbghtnygnguoegtgfo:30Martie2026!@aws-1-eu-west-2.pooler.supabase.com:6543/postgres"
engine = create_engine(DATABASE_URL)
db = sessionmaker(bind=engine)()

try:
    users = db.execute(text("SELECT id, email, raw_app_meta_data FROM auth.users WHERE email IN ('test@test.be', 's.j@isoflex.com', 'j.doe@isoflex.com')")).fetchall()
    print("Users in auth.users:")
    for u in users:
        print(u)
except Exception as e:
    print("Error:", e)
