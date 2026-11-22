from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

DATABASE_URL = "postgresql://postgres.ltxbghtnygnguoegtgfo:30Martie2026!@aws-1-eu-west-2.pooler.supabase.com:6543/postgres"
engine = create_engine(DATABASE_URL)
db = sessionmaker(bind=engine)()

davide = db.execute(text("SELECT id, name FROM saas_app.clients WHERE name ILIKE '%davide%'")).fetchall()
print("Davide clients:", davide)

partner_users = db.execute(text("SELECT id, email, role, metadata FROM saas_app.users WHERE role = 'PARTNER'")).fetchall()
for u in partner_users:
    print(u)
