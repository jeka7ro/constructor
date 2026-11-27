from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

DATABASE_URL = "postgresql://postgres.ltxbghtnygnguoegtgfo:30Martie2026!@aws-1-eu-west-2.pooler.supabase.com:6543/postgres"
engine = create_engine(DATABASE_URL)
db = sessionmaker(bind=engine)()

org = db.execute(text("SELECT id, name FROM saas_app.organizations")).fetchall()
print("Orgs:", org)

clients = db.execute(text("SELECT id, name FROM saas_app.clients WHERE id = '84b73e6b-8e3c-45f6-b133-9e19d41a1bf2'")).fetchall()
print("Client 84b73e6b...:", clients)

