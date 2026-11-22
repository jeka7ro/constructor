from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

DATABASE_URL = "postgresql://postgres.ltxbghtnygnguoegtgfo:30Martie2026!@aws-1-eu-west-2.pooler.supabase.com:6543/postgres"
engine = create_engine(DATABASE_URL)
db = sessionmaker(bind=engine)()

# Find Isoflex clients
clients = db.execute(text("SELECT id, name, email FROM saas_app.clients WHERE name ILIKE '%isoflex%'")).fetchall()
print("Clients:")
for c in clients:
    print(c)

# Find Partner users
users = db.execute(text("SELECT id, email, client_id, organization_id FROM saas_app.users WHERE email ILIKE '%isoflex%' OR email = 'test@test.be'")).fetchall()
print("\nUsers:")
for u in users:
    print(u)
