from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

DATABASE_URL = "postgresql://postgres.ltxbghtnygnguoegtgfo:30Martie2026!@aws-1-eu-west-2.pooler.supabase.com:6543/postgres"
engine = create_engine(DATABASE_URL)
db = sessionmaker(bind=engine)()

# Check if 'a58df692-672f-459e-9c19-4b501b72bee1' is Davide Chape SRL
davide = db.execute(text("SELECT id, name FROM saas_app.clients WHERE id = 'a58df692-672f-459e-9c19-4b501b72bee1'")).fetchone()
print("Client a58df692-672f-459e-9c19-4b501b72bee1 is:", davide)

