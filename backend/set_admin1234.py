import bcrypt
import os
from sqlalchemy import create_engine, text

# Get URL from .env or use fallback
db_url = os.environ.get("DATABASE_URL", "postgresql://postgres.ltxbghtnygnguoegtgfo:30Martie2026!@aws-1-eu-west-2.pooler.supabase.com:6543/postgres")

engine = create_engine(db_url)
new_hash = bcrypt.hashpw(b"admin1234", bcrypt.gensalt()).decode('utf-8')

with engine.connect() as conn:
    conn.execute(text("UPDATE saas_app.admins SET password_hash = :h WHERE lower(email) = 'jeka7ro@gmail.com'"), {"h": new_hash})
    conn.commit()

print("Password updated to admin1234")
