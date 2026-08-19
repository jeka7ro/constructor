import os
from sqlalchemy import create_engine, text

db_url = os.environ.get("DATABASE_URL", "postgresql://postgres.ltxbghtnygnguoegtgfo:30Martie2026!@aws-1-eu-west-2.pooler.supabase.com:6543/postgres")
engine = create_engine(db_url)
old_hash = "$2b$12$/9dCdH3dmvjcOqDXDWLMpOT8f7wmyn3zZVsKW9VmwFctLVQdOwYqK"

with engine.connect() as conn:
    conn.execute(text("UPDATE saas_app.admins SET password_hash = :h WHERE lower(email) = 'jeka7ro@gmail.com'"), {"h": old_hash})
    conn.commit()

print("Original hash restored successfully")
