from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
import json

DATABASE_URL = "postgresql://postgres.ltxbghtnygnguoegtgfo:30Martie2026!@aws-1-eu-west-2.pooler.supabase.com:6543/postgres"
engine = create_engine(DATABASE_URL)
db = sessionmaker(bind=engine)()

res = db.execute(text("""
SELECT id, name FROM saas_app.clients WHERE name ILIKE '%isoflex%'
""")).fetchall()

print("Isoflex clients:")
for r in res:
    print(r)

