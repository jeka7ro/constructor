from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
import json

DATABASE_URL = "postgresql://postgres.ltxbghtnygnguoegtgfo:30Martie2026!@aws-1-eu-west-2.pooler.supabase.com:6543/postgres"
engine = create_engine(DATABASE_URL)
db = sessionmaker(bind=engine)()

res = db.execute(text("""
SELECT u.id, u.email, u.raw_app_meta_data, 
       c.id as client_id, c.name as client_name
FROM auth.users u
LEFT JOIN saas_app.clients c ON c.id = (u.raw_app_meta_data->>'client_id')::varchar
WHERE u.email IN ('test@test.be', 's.j@isoflex.com', 'j.doe@isoflex.com')
""")).fetchall()

print("Users and their linked clients:")
for r in res:
    print(r)

