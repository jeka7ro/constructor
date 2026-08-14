import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

engine = create_engine(os.environ.get("DATABASE_URL", "postgresql://postgres.ltxbghtnygnguoegtgfo:30Martie2026!@aws-1-eu-west-2.pooler.supabase.com:6543/postgres"))
Session = sessionmaker(bind=engine)
session = Session()

res = session.execute(text("SELECT password_hash FROM saas_app.admins WHERE lower(email) = 'jeka7ro@gmail.com'"))
for row in res:
    print(row[0])
