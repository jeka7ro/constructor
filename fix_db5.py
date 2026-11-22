from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

DATABASE_URL = "postgresql://postgres.ltxbghtnygnguoegtgfo:30Martie2026!@aws-1-eu-west-2.pooler.supabase.com:6543/postgres"
engine = create_engine(DATABASE_URL)
db = sessionmaker(bind=engine)()

db.execute(text("UPDATE saas_app.users SET metadata = jsonb_set(metadata, '{client_id}', '\"a58df692-672f-459e-9c19-4b501b72bee1\"') WHERE email IN ('test@test.be', 's.j@isoflex.com', 'j.doe@isoflex.com')"))
db.commit()
print("Updated users!")
